// 견적서 상세/수정/삭제
// GET    /api/quotations/:id
// PATCH  /api/quotations/:id   — 작성 치과만 (status PENDING 한정)
// DELETE /api/quotations/:id   — 작성 치과만 (soft delete)

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { quotationCreateSchema } from "@/lib/zod-schemas";

type RouteCtx = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const q = await prisma.quotation.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      request: {
        select: {
          id: true,
          patientId: true,
          symptoms: true,
          urgency: true,
          missingTeeth: true,
          patient: { include: { user: { select: { name: true } } } },
        },
      },
      dentist: { include: { user: { select: { name: true } } } },
      clinic: true,
      implantItems: { orderBy: { displayOrder: "asc" } },
      additionalItems: { orderBy: { displayOrder: "asc" } },
      consultationSchedules: { orderBy: { consultationDate: "asc" } },
    },
  });
  if (!q) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // 환자(요청 작성자) 또는 견적 작성 치과만 조회 가능
  const isPatient = session.user.id === q.request.patientId;
  const isAuthor = session.user.id === q.dentistId;
  if (!isPatient && !isAuthor) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  return NextResponse.json(serialize(q));
}

export async function PATCH(req: Request, { params }: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await prisma.quotation.findUnique({
    where: { id: params.id, deletedAt: null },
    select: { dentistId: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (existing.dentistId !== session.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (existing.status !== "PENDING" && existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "INVALID_STATE", message: "PENDING 상태에서만 수정 가능" },
      { status: 400 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = quotationCreateSchema
    .omit({ quotationRequestId: true })
    .partial()
    .safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    // 임플란트 항목 교체
    if (data.implantItems !== undefined) {
      await tx.quotationImplantItem.deleteMany({ where: { quotationId: params.id } });
      if (data.implantItems.length > 0) {
        await tx.quotationImplantItem.createMany({
          data: data.implantItems.map((it, idx) => ({
            quotationId: params.id,
            toothNumber: it.toothNumber,
            brand: it.brand,
            quantity: it.quantity ?? 1,
            unitPrice: BigInt(it.unitPrice),
            subtotal: BigInt(it.unitPrice * (it.quantity ?? 1)),
            displayOrder: idx,
          })),
        });
      }
    }
    if (data.additionalItems !== undefined) {
      await tx.quotationAdditionalItem.deleteMany({ where: { quotationId: params.id } });
      if (data.additionalItems.length > 0) {
        await tx.quotationAdditionalItem.createMany({
          data: data.additionalItems.map((it, idx) => ({
            quotationId: params.id,
            description: it.description,
            price: BigInt(it.price),
            displayOrder: idx,
          })),
        });
      }
    }

    // 합계 재계산
    const items = await tx.quotationImplantItem.findMany({ where: { quotationId: params.id } });
    const adds = await tx.quotationAdditionalItem.findMany({ where: { quotationId: params.id } });
    const implantTotal = items.reduce((s, i) => s + Number(i.subtotal), 0);
    const additionalTotal = adds.reduce((s, i) => s + Number(i.price), 0);
    const totalAmount = implantTotal + additionalTotal;
    const discountRate = data.discountRate ?? 0;
    const discountAmount = Math.floor((totalAmount * discountRate) / 100);
    const finalAmount = totalAmount - discountAmount;

    return tx.quotation.update({
      where: { id: params.id },
      data: {
        treatmentPlan: data.treatmentPlan,
        treatmentDuration: data.treatmentDuration,
        warrantyPeriod: data.warrantyPeriod,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        additionalNotes: data.additionalNotes,
        implantTotalAmount: BigInt(implantTotal),
        additionalTotalAmount: BigInt(additionalTotal),
        totalAmount: BigInt(totalAmount),
        discountRate,
        discountAmount: BigInt(discountAmount),
        finalAmount: BigInt(finalAmount),
      },
    });
  });

  return NextResponse.json(serialize(updated));
}

export async function DELETE(_req: Request, { params }: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await prisma.quotation.findUnique({
    where: { id: params.id, deletedAt: null },
    select: { dentistId: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (existing.dentistId !== session.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await prisma.quotation.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), status: "WITHDRAWN" },
  });
  return NextResponse.json({ ok: true });
}

function serialize<
  T extends {
    implantTotalAmount?: bigint;
    additionalTotalAmount?: bigint;
    totalAmount?: bigint;
    discountAmount?: bigint;
    finalAmount?: bigint;
  },
>(q: T): T & Record<string, unknown> {
  const conv = (v?: bigint) => (v === undefined || v === null ? undefined : v.toString());
  return {
    ...q,
    implantTotalAmount: conv(q.implantTotalAmount),
    additionalTotalAmount: conv(q.additionalTotalAmount),
    totalAmount: conv(q.totalAmount),
    discountAmount: conv(q.discountAmount),
    finalAmount: conv(q.finalAmount),
  };
}
