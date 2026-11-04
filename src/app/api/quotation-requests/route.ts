// 견적 요청 목록/생성
// GET  /api/quotation-requests        — 본인의 요청 목록 (환자) | 공개 OPEN 목록 (치과)
// POST /api/quotation-requests        — 환자만 생성

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { quotationRequestSchema } from "@/lib/zod-schemas";
import { getDentistAccess, notVerifiedResponse } from "@/lib/dentist-access";
import { maskName } from "@/lib/anonymize";
import { addDays } from "@/lib/kst";
import { isOwnUpload, toViewUrls } from "@/lib/s3";

// 견적 요청은 만든 뒤 이 기간이 지나면 cron(/api/cron/expire)이 EXPIRED 로 바꾼다
const REQUEST_OPEN_DAYS = 30;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  // 치과: OPEN 상태의 모든 요청 — 면허 인증된 의사만, 환자 이름은 가리고 지역(시/구)까지만
  if (session.user.role === "DENTIST") {
    const access = await getDentistAccess(session.user.id);
    if (!access.isVerified) return notVerifiedResponse();

    const list = await prisma.quotationRequest.findMany({
      where: { status: "OPEN", deletedAt: null },
      include: {
        patient: { select: { sido: true, sigungu: true, user: { select: { name: true } } } },
        missingTeeth: true,
        photos: { orderBy: { displayOrder: "asc" } },
        _count: { select: { quotations: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const safe = await Promise.all(
      list.map(async (r) => ({
        ...serializeRequest(r),
        patient: { ...r.patient, user: { name: maskName(r.patient.user.name) } },
        photos: await signPhotos(r.photos),
      })),
    );
    return NextResponse.json(safe);
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
    const safe = await Promise.all(
      list.map(async (r) => ({ ...serializeRequest(r), photos: await signPhotos(r.photos) })),
    );
    return NextResponse.json(safe);
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

  // 사진은 본인이 이 서비스로 올린 파일만 허용 (외부 URL·남의 파일 차단)
  if (data.photoUrls.some((u) => !isOwnUpload(u, session.user.id))) {
    return NextResponse.json(
      { error: "INVALID_PHOTO", message: "직접 올린 사진만 첨부할 수 있습니다" },
      { status: 400 },
    );
  }

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
      expiresAt: addDays(new Date(), REQUEST_OPEN_DAYS),
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

  return NextResponse.json(
    { ...serializeRequest(created), photos: await signPhotos(created.photos) },
    { status: 201 },
  );
}

async function signPhotos<T extends { photoUrl: string }>(photos: T[]): Promise<T[]> {
  const urls = await toViewUrls(photos.map((p) => p.photoUrl));
  return photos.map((p, i) => ({ ...p, photoUrl: urls[i] }));
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
