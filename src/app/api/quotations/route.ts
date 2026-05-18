// 견적서 목록 / 생성
// GET  /api/quotations              — 본인 작성 견적 (치과) | 받은 견적 (환자)
// POST /api/quotations              — 치과만 생성

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { quotationCreateSchema } from "@/lib/zod-schemas";
import { sendQuotationReceivedEmail } from "@/lib/mailer";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  if (session.user.role === "DENTIST") {
    const list = await prisma.quotation.findMany({
      where: { dentistId: session.user.id, deletedAt: null },
      include: {
        request: {
          select: {
            id: true,
            symptoms: true,
            urgency: true,
            patient: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(list.map(serializeQuotation));
  }

  if (session.user.role === "PATIENT") {
    const list = await prisma.quotation.findMany({
      where: {
        request: { patientId: session.user.id },
        deletedAt: null,
      },
      include: {
        dentist: { include: { user: { select: { name: true } } } },
        clinic: { select: { id: true, name: true, rating: true, reviewCount: true } },
        request: { select: { id: true, symptoms: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(list.map(serializeQuotation));
  }

  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "DENTIST") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "치과의사만 견적서를 작성할 수 있습니다" },
      { status: 403 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = quotationCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // 치과의 소속 병원 확인
  const dentist = await prisma.dentist.findUnique({
    where: { id: session.user.id },
    select: { clinicId: true },
  });
  if (!dentist?.clinicId) {
    return NextResponse.json(
      { error: "INVALID_STATE", message: "병원 등록 후 견적서 작성이 가능합니다" },
      { status: 400 },
    );
  }

  // 견적 요청 상태 확인
  const request = await prisma.quotationRequest.findUnique({
    where: { id: data.quotationRequestId, deletedAt: null },
    select: { status: true },
  });
  if (!request) {
    return NextResponse.json({ error: "REQUEST_NOT_FOUND" }, { status: 404 });
  }
  if (request.status !== "OPEN") {
    return NextResponse.json(
      { error: "REQUEST_CLOSED", message: "이미 마감된 요청입니다" },
      { status: 400 },
    );
  }

  // 금액 계산 (DB 의 BigInt 와 안전 계산하기 위해 number 로 진행 후 BigInt 변환)
  const implantTotal = data.implantItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const additionalTotal = data.additionalItems.reduce((sum, item) => sum + item.price, 0);
  const totalAmount = implantTotal + additionalTotal;
  const discountAmount = Math.floor((totalAmount * data.discountRate) / 100);
  const finalAmount = totalAmount - discountAmount;

  try {
    const created = await prisma.quotation.create({
      data: {
        quotationRequestId: data.quotationRequestId,
        dentistId: session.user.id,
        clinicId: dentist.clinicId,
        treatmentPlan: data.treatmentPlan,
        implantTotalAmount: BigInt(implantTotal),
        additionalTotalAmount: BigInt(additionalTotal),
        totalAmount: BigInt(totalAmount),
        discountRate: data.discountRate,
        discountAmount: BigInt(discountAmount),
        finalAmount: BigInt(finalAmount),
        treatmentDuration: data.treatmentDuration,
        warrantyPeriod: data.warrantyPeriod,
        additionalNotes: data.additionalNotes,
        validUntil: new Date(data.validUntil),
        status: "PENDING",
        implantItems: {
          create: data.implantItems.map((it, idx) => ({
            toothNumber: it.toothNumber,
            brand: it.brand,
            quantity: it.quantity,
            unitPrice: BigInt(it.unitPrice),
            subtotal: BigInt(it.unitPrice * it.quantity),
            displayOrder: idx,
          })),
        },
        additionalItems: {
          create: data.additionalItems.map((it, idx) => ({
            description: it.description,
            price: BigInt(it.price),
            displayOrder: idx,
          })),
        },
        consultationSchedules: {
          create: data.consultationSchedules.map((s) => ({
            consultationDate: new Date(s.consultationDate),
            consultationTime: s.consultationTime,
            duration: s.duration,
          })),
        },
      },
    });

    // 환자에게 새 견적서 도착 알림 (fire-and-forget)
    void (async () => {
      try {
        const r = await prisma.quotationRequest.findUnique({
          where: { id: data.quotationRequestId },
          include: {
            patient: { include: { user: { select: { email: true, name: true } } } },
          },
        });
        const clinic = await prisma.clinic.findUnique({
          where: { id: dentist.clinicId! },
          select: { name: true },
        });
        if (r?.patient.user.email && clinic) {
          await sendQuotationReceivedEmail({
            to: r.patient.user.email,
            patientName: r.patient.user.name,
            clinicName: clinic.name,
            finalAmount: created.finalAmount,
            quotationId: created.id,
          });
        }
      } catch (e) {
        console.error("[notify] 견적서 도착 메일 실패:", e);
      }
    })();

    return NextResponse.json(serializeQuotation(created), { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "DUPLICATE", message: "이 견적 요청에 이미 견적서를 작성하셨습니다" },
        { status: 409 },
      );
    }
    console.error("[quotations POST] error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// BigInt → string 직렬화
function serializeQuotation<
  T extends {
    implantTotalAmount: bigint;
    additionalTotalAmount: bigint;
    totalAmount: bigint;
    discountAmount: bigint;
    finalAmount: bigint;
  },
>(q: T) {
  return {
    ...q,
    implantTotalAmount: q.implantTotalAmount.toString(),
    additionalTotalAmount: q.additionalTotalAmount.toString(),
    totalAmount: q.totalAmount.toString(),
    discountAmount: q.discountAmount.toString(),
    finalAmount: q.finalAmount.toString(),
  };
}
