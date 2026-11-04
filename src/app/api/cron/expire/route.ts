// 만료 처리 cron — 하루 한 번 (vercel.json 의 crons 참고, 서울 00:05)
//
// 1) 견적 요청: OPEN 이고 expiresAt 이 지난 요청 → EXPIRED
//    (그 요청에 남아 있던 PENDING 견적서도 함께 EXPIRED)
// 2) 견적서: PENDING 이고 validUntil(서울 기준 날짜)이 지난 견적서 → EXPIRED
// 상태가 바뀐 견적서는 모두 이력(QuotationStatusHistory)을 남긴다.
//
// expiresAt 이 비어 있는 예전 요청은 건드리지 않는다 (새 요청부터 생성 시 30일로 채워진다).
//
// 보안: CRON_SECRET (Authorization: Bearer) 로만 허용

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { kstTodayAsDbDate } from "@/lib/kst";

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();
  const today = kstTodayAsDbDate(now);

  const result = await prisma.$transaction(async (tx) => {
    // 1) 기간이 지난 열린 요청
    const expiredRequests = await tx.quotationRequest.findMany({
      where: { status: "OPEN", deletedAt: null, expiresAt: { lt: now } },
      select: { id: true },
    });
    const requestIds = expiredRequests.map((r) => r.id);
    if (requestIds.length > 0) {
      await tx.quotationRequest.updateMany({
        where: { id: { in: requestIds }, status: "OPEN" },
        data: { status: "EXPIRED" },
      });
    }

    // 2) 만료 대상 견적서: 만료된 요청에 남은 PENDING + 유효기간 지난 PENDING
    const expiringQuotations = await tx.quotation.findMany({
      where: {
        status: "PENDING",
        deletedAt: null,
        OR: [
          ...(requestIds.length > 0 ? [{ quotationRequestId: { in: requestIds } }] : []),
          { validUntil: { lt: today } },
        ],
      },
      select: { id: true, quotationRequestId: true, validUntil: true },
    });
    const quotationIds = expiringQuotations.map((q) => q.id);
    if (quotationIds.length > 0) {
      await tx.quotation.updateMany({
        where: { id: { in: quotationIds }, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      const expiredRequestSet = new Set(requestIds);
      await tx.quotationStatusHistory.createMany({
        data: expiringQuotations.map((q) => ({
          quotationId: q.id,
          oldStatus: "PENDING" as const,
          newStatus: "EXPIRED" as const,
          changedById: null,
          changeReason: expiredRequestSet.has(q.quotationRequestId)
            ? "견적 요청 기간 만료"
            : "견적서 유효기간 만료",
        })),
      });
    }

    return { expiredRequests: requestIds.length, expiredQuotations: quotationIds.length };
  });

  console.log("[cron:expire]", result);
  return NextResponse.json({ ok: true, ...result });
}
