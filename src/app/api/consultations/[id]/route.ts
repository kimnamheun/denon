// 상담 예약 상세 / 상태 변경
// GET   /api/consultations/:id
// PATCH /api/consultations/:id  { status: "COMPLETED" | "CANCELLED" | "NO_SHOW", notes?: string }

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
  notes: z.string().optional(),
});

type RouteCtx = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const c = await prisma.consultation.findUnique({
    where: { id: params.id },
    include: {
      patient: { include: { user: { select: { name: true, email: true, phoneNumber: true } } } },
      dentist: { include: { user: { select: { name: true } } } },
      clinic: true,
      quotation: { select: { id: true, finalAmount: true } },
    },
  });
  if (!c) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (c.patientId !== session.user.id && c.dentistId !== session.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  return NextResponse.json({
    ...c,
    quotation: c.quotation
      ? { ...c.quotation, finalAmount: c.quotation.finalAmount.toString() }
      : null,
  });
}

export async function PATCH(req: Request, { params }: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const c = await prisma.consultation.findUnique({
    where: { id: params.id },
    select: { id: true, patientId: true, dentistId: true, status: true },
  });
  if (!c) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (c.patientId !== session.user.id && c.dentistId !== session.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // 환자는 취소만 가능, 치과는 모든 상태 변경 가능
  if (session.user.role === "PATIENT" && parsed.data.status !== "CANCELLED") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "환자는 취소만 가능합니다" },
      { status: 403 },
    );
  }

  const updated = await prisma.consultation.update({
    where: { id: params.id },
    data: { status: parsed.data.status, notes: parsed.data.notes },
  });
  return NextResponse.json(updated);
}
