// 만료 처리 — 견적 요청(expiresAt)·견적서(validUntil) EXPIRED 처리 + 이력
// /api/cron/expire (수동 실행용) 와 /api/cron/daily (매일 cron) 가 같이 쓴다.

import { prisma } from "@/lib/prisma";
import { kstTodayAsDbDate } from "@/lib/kst";

export async function runExpireJob(now: Date = new Date()) {
  const today = kstTodayAsDbDate(now);

  return prisma.$transaction(async (tx) => {
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
}
