// 리뷰 생성
// POST /api/reviews
// 환자만 작성 가능, COMPLETED 상태 상담 후만 가능

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { reviewCreateSchema } from "@/lib/zod-schemas";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = reviewCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // 1) 완료된 상담이 있어야 리뷰 가능
  const completedCount = await prisma.consultation.count({
    where: {
      patientId: session.user.id,
      dentistId: data.dentistId,
      status: "COMPLETED",
    },
  });
  if (completedCount === 0) {
    return NextResponse.json(
      { error: "NO_COMPLETED_CONSULTATION", message: "완료된 상담이 있어야 리뷰 작성이 가능합니다" },
      { status: 400 },
    );
  }

  // 2) 같은 환자가 같은 병원에 중복 리뷰 작성 방지 (단순 정책: 견적당 1회)
  if (data.quotationId) {
    const dup = await prisma.review.findFirst({
      where: {
        patientId: session.user.id,
        quotationId: data.quotationId,
        deletedAt: null,
      },
    });
    if (dup) {
      return NextResponse.json(
        { error: "DUPLICATE", message: "이미 해당 견적에 리뷰를 작성하셨습니다" },
        { status: 409 },
      );
    }
  }

  const review = await prisma.$transaction(async (tx) => {
    const r = await tx.review.create({
      data: {
        patientId: session.user.id,
        dentistId: data.dentistId,
        clinicId: data.clinicId,
        quotationId: data.quotationId,
        rating: data.rating,
        comment: data.comment,
      },
    });
    // 병원 평점 / 리뷰 수 재계산 (정확성을 위해 모든 리뷰 평균)
    const agg = await tx.review.aggregate({
      where: { clinicId: data.clinicId, deletedAt: null },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await tx.clinic.update({
      where: { id: data.clinicId },
      data: {
        rating: agg._avg.rating ?? 0,
        reviewCount: agg._count._all,
      },
    });
    return r;
  });

  return NextResponse.json(review, { status: 201 });
}
