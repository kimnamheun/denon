// 견적 요청 상세/수정/삭제
// GET    /api/quotation-requests/:id
// PATCH  /api/quotation-requests/:id   — 본인만
// DELETE /api/quotation-requests/:id   — 본인만 (soft delete)

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { quotationRequestSchema } from "@/lib/zod-schemas";
import { maskName } from "@/lib/anonymize";
import {
  canDentistSeePatientName,
  canDentistViewRequest,
  getDentistAccess,
  requestAccessDenied,
} from "@/lib/dentist-access";
import { isOwnUpload, toViewUrls } from "@/lib/s3";

type RouteCtx = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const request = await prisma.quotationRequest.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      patient: { select: { sido: true, sigungu: true, user: { select: { name: true } } } },
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

  const photos = await signPhotos(request.photos);

  // 작성자(환자) 본인 — 받은 견적서 전체를 본다
  if (session.user.id === request.patientId) {
    return NextResponse.json({
      ...serializeRequest(request),
      photos,
      quotations: request.quotations.map(serializeQuotationAmounts),
    });
  }

  if (session.user.role !== "DENTIST") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // 의사 — 면허 인증 + OPEN 요청이거나, 이미 견적서를 낸 요청만.
  // 다른 병원 견적서(가격)는 보이지 않게 내 견적서만 남기고, 환자 이름은 수락 전까지 가린다.
  const own = request.quotations.filter((q) => q.dentistId === session.user.id);
  const access = await getDentistAccess(session.user.id);
  const canView = canDentistViewRequest({
    canUseRequests: access.canUseRequests,
    requestStatus: request.status,
    hasOwnQuotation: own.length > 0,
  });
  if (!canView) {
    return access.canUseRequests
      ? NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
      : requestAccessDenied(access);
  }

  const showName = canDentistSeePatientName(own[0]?.status);
  return NextResponse.json({
    ...serializeRequest(request),
    photos,
    patient: {
      ...request.patient,
      user: { name: showName ? request.patient.user.name : maskName(request.patient.user.name) },
    },
    quotations: own.map(serializeQuotationAmounts),
  });
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
  // 사진은 본인이 이 서비스로 올린 파일만 허용
  if (data.photoUrls?.some((u) => !isOwnUpload(u, session.user.id))) {
    return NextResponse.json(
      { error: "INVALID_PHOTO", message: "직접 올린 사진만 첨부할 수 있습니다" },
      { status: 400 },
    );
  }
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

  return NextResponse.json({ ...serializeRequest(updated), photos: await signPhotos(updated.photos) });
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

async function signPhotos<T extends { photoUrl: string }>(photos: T[]): Promise<T[]> {
  const urls = await toViewUrls(photos.map((p) => p.photoUrl));
  return photos.map((p, i) => ({ ...p, photoUrl: urls[i] }));
}

// 견적서 금액(BigInt) → 문자열
function serializeQuotationAmounts<
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

function serializeRequest<T extends { minBudget?: bigint | null; maxBudget?: bigint | null }>(
  r: T,
) {
  return {
    ...r,
    minBudget: r.minBudget?.toString() ?? null,
    maxBudget: r.maxBudget?.toString() ?? null,
  };
}
