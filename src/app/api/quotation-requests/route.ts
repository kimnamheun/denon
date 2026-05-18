// 견적 요청 목록/생성
// GET  /api/quotation-requests        — 본인의 요청 목록 (환자) | 공개 OPEN 목록 (치과)
// POST /api/quotation-requests        — 환자만 생성

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { quotationRequestSchema } from "@/lib/zod-schemas";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  // 치과: OPEN 상태의 모든 요청
  if (session.user.role === "DENTIST") {
    const list = await prisma.quotationRequest.findMany({
      where: { status: "OPEN", deletedAt: null },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        missingTeeth: true,
        photos: true,
        _count: { select: { quotations: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(list);
  }

  // 환자: 본인 요청만
  if (session.user.role === "PATIENT") {
    const where: Prisma.QuotationRequestWhereInput = {
      patientId: session.user.id,
      deletedAt: null,
    };
    if (status) where.status = status as Prisma.QuotationRequestWhereInput["status"];

    const list = await prisma.quotationRequest.findMany({
      where,
      include: {
        missingTeeth: true,
        photos: true,
        _count: { select: { quotations: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(list);
  }

  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "FORBIDDEN", message: "환자만 견적 요청을 생성할 수 있습니다" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = quotationRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const created = await prisma.quotationRequest.create({
    data: {
      patientId: session.user.id,
      symptoms: data.symptoms,
      previousTreatment: data.previousTreatment,
      urgency: data.urgency,
      minBudget: data.minBudget ? BigInt(data.minBudget) : null,
      maxBudget: data.maxBudget ? BigInt(data.maxBudget) : null,
      preferredImplantBrand: data.preferredImplantBrand,
      preferredHospitalType: data.preferredHospitalType,
      additionalNotes: data.additionalNotes,
      missingTeeth: {
        create: data.missingTeeth.map((toothNumber) => ({ toothNumber })),
      },
      photos: {
        create: data.photoUrls.map((photoUrl, idx) => ({
          photoUrl,
          displayOrder: idx,
        })),
      },
    },
    include: { missingTeeth: true, photos: true },
  });

  return NextResponse.json(serializeRequest(created), { status: 201 });
}

// BigInt → JSON 직렬화 호환
function serializeRequest<T extends { minBudget: bigint | null; maxBudget: bigint | null }>(
  r: T,
) {
  return {
    ...r,
    minBudget: r.minBudget?.toString() ?? null,
    maxBudget: r.maxBudget?.toString() ?? null,
  };
}
