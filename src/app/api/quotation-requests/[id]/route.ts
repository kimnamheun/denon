// 견적 요청 상세/수정/삭제
// GET    /api/quotation-requests/:id
// PATCH  /api/quotation-requests/:id   — 본인만
// DELETE /api/quotation-requests/:id   — 본인만 (soft delete)

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { quotationRequestSchema } from "@/lib/zod-schemas";

type RouteCtx = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const request = await prisma.quotationRequest.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      patient: { include: { user: { select: { name: true, email: true } } } },
      missingTeeth: true,
      photos: { orderBy: { displayOrder: "asc" } },
      quotations: {
        where: { deletedAt: null },
        include: {
          dentist: { include: { user: { select: { name: true } } } },
          clinic: { select: { id: true, name: true, rating: true, reviewCount: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!request) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // 권한: 작성자(환자) 또는 모든 치과는 OPEN 인 요청 조회 가능
  const isOwner = session.user.id === request.patientId;
  const canView =
    isOwner || (session.user.role === "DENTIST" && request.status === "OPEN");

  if (!canView) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  return NextResponse.json(serializeRequest(request));
}

export async function PATCH(req: Request, { params }: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await prisma.quotationRequest.findUnique({
    where: { id: params.id, deletedAt: null },
    select: { patientId: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (existing.patientId !== session.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (existing.status !== "OPEN") {
    return NextResponse.json(
      { error: "INVALID_STATE", message: "OPEN 상태에서만 수정할 수 있습니다" },
      { status: 400 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = quotationRequestSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const updated = await prisma.$transaction(async (tx) => {
    if (data.missingTeeth !== undefined) {
      await tx.quotationRequestMissingTooth.deleteMany({ where: { requestId: params.id } });
      if (data.missingTeeth.length > 0) {
        await tx.quotationRequestMissingTooth.createMany({
          data: data.missingTeeth.map((toothNumber) => ({
            requestId: params.id,
            toothNumber,
          })),
        });
      }
    }
    if (data.photoUrls !== undefined) {
      await tx.quotationRequestPhoto.deleteMany({ where: { requestId: params.id } });
      if (data.photoUrls.length > 0) {
        await tx.quotationRequestPhoto.createMany({
          data: data.photoUrls.map((photoUrl, idx) => ({
            requestId: params.id,
            photoUrl,
            displayOrder: idx,
          })),
        });
      }
    }
    return tx.quotationRequest.update({
      where: { id: params.id },
      data: {
        symptoms: data.symptoms,
        previousTreatment: data.previousTreatment,
        urgency: data.urgency,
        minBudget: data.minBudget !== undefined ? (data.minBudget === null ? null : BigInt(data.minBudget)) : undefined,
        maxBudget: data.maxBudget !== undefined ? (data.maxBudget === null ? null : BigInt(data.maxBudget)) : undefined,
        preferredImplantBrand: data.preferredImplantBrand,
        preferredHospitalType: data.preferredHospitalType,
        additionalNotes: data.additionalNotes,
      },
      include: { missingTeeth: true, photos: true },
    });
  });

  return NextResponse.json(serializeRequest(updated));
}

export async function DELETE(_req: Request, { params }: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await prisma.quotationRequest.findUnique({
    where: { id: params.id, deletedAt: null },
    select: { patientId: true },
  });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (existing.patientId !== session.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await prisma.quotationRequest.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), status: "CLOSED" },
  });
  return NextResponse.json({ ok: true });
}

function serializeRequest<T extends { minBudget?: bigint | null; maxBudget?: bigint | null }>(
  r: T,
) {
  return {
    ...r,
    minBudget: r.minBudget?.toString() ?? null,
    maxBudget: r.maxBudget?.toString() ?? null,
  };
}
