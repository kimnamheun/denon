// 상담 예약 목록 / 생성
// GET  /api/consultations         — 본인 관련 예약
// POST /api/consultations         — 환자만 생성

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { consultationCreateSchema } from "@/lib/zod-schemas";
import { sendConsultationBookedEmail } from "@/lib/mailer";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  if (session.user.role === "PATIENT") {
    const list = await prisma.consultation.findMany({
      where: { patientId: session.user.id },
      include: {
        dentist: { include: { user: { select: { name: true } } } },
        clinic: { select: { id: true, name: true, sido: true, sigungu: true } },
      },
      orderBy: { scheduledAt: "desc" },
    });
    return NextResponse.json(list);
  }

  if (session.user.role === "DENTIST") {
    const list = await prisma.consultation.findMany({
      where: { dentistId: session.user.id },
      include: {
        patient: { include: { user: { select: { name: true } } } },
      },
      orderBy: { scheduledAt: "desc" },
    });
    return NextResponse.json(list);
  }

  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = consultationCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // 치과/병원 유효성 검사
  const dentist = await prisma.dentist.findUnique({
    where: { id: data.dentistId },
    select: { id: true, clinicId: true },
  });
  if (!dentist) return NextResponse.json({ error: "DENTIST_NOT_FOUND" }, { status: 404 });
  if (dentist.clinicId !== data.clinicId) {
    return NextResponse.json(
      { error: "INVALID_CLINIC", message: "선택한 의사와 병원이 일치하지 않습니다" },
      { status: 400 },
    );
  }

  const created = await prisma.consultation.create({
    data: {
      patientId: session.user.id,
      dentistId: data.dentistId,
      clinicId: data.clinicId,
      quotationId: data.quotationId,
      scheduledAt: new Date(data.scheduledAt),
      duration: data.duration,
      notes: data.notes,
      status: "SCHEDULED",
    },
  });

  // 양쪽에 예약 확정 알림 (fire-and-forget)
  void (async () => {
    try {
      const detail = await prisma.consultation.findUnique({
        where: { id: created.id },
        include: {
          patient: { include: { user: { select: { email: true, name: true } } } },
          dentist: { include: { user: { select: { email: true, name: true } } } },
        },
      });
      if (!detail) return;
      const at = detail.scheduledAt;
      if (detail.patient.user.email) {
        await sendConsultationBookedEmail({
          to: detail.patient.user.email,
          recipientName: detail.patient.user.name,
          counterpartName: `${detail.dentist.user.name} 원장`,
          scheduledAt: at,
          duration: detail.duration,
          consultationId: detail.id,
          recipientRole: "PATIENT",
        });
      }
      if (detail.dentist.user.email) {
        await sendConsultationBookedEmail({
          to: detail.dentist.user.email,
          recipientName: `${detail.dentist.user.name} 원장`,
          counterpartName: detail.patient.user.name,
          scheduledAt: at,
          duration: detail.duration,
          consultationId: detail.id,
          recipientRole: "DENTIST",
        });
      }
    } catch (e) {
      console.error("[notify] 예약 메일 실패:", e);
    }
  })();

  return NextResponse.json(created, { status: 201 });
}
