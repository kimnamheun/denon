// 의사 월 정액 이용권 — DB·결제 처리 (서버 전용)

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { openSecret, sealSecret } from "@/lib/crypto-box";
import { chargeBilling, getPaymentByOrderId, issueBillingKey, TossError, type TossPayment } from "@/lib/toss";
import {
  MAX_RENEWAL_FAILURES,
  MONTHLY_PLAN,
  addMonthsKst,
  buildOrderId,
  isDueForRenewal,
  isSubscriptionActive,
  summarizeCard,
} from "@/lib/subscription";

export class SubscriptionError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** 의사의 이용권 행 — 없으면 카드 등록 전(PENDING) 상태로 만든다 */
export async function getOrCreateSubscription(dentistId: string) {
  const existing = await prisma.dentistSubscription.findUnique({ where: { dentistId } });
  if (existing) return existing;
  return prisma.dentistSubscription.create({
    data: {
      dentistId,
      amount: MONTHLY_PLAN.amount,
      status: "PENDING",
      source: "TOSS_BILLING",
      customerKey: `cus_${randomUUID().replace(/-/g, "")}`,
    },
  });
}

export async function getSubscriptionStatus(dentistId: string, now: Date = new Date()) {
  const sub = await prisma.dentistSubscription.findUnique({ where: { dentistId } });
  return { subscription: sub, active: isSubscriptionActive(sub, now) };
}

type SubRow = Awaited<ReturnType<typeof getOrCreateSubscription>>;

interface ChargeResult {
  ok: boolean;
  payment?: TossPayment;
  failureCode?: string;
  failureMessage?: string;
}

/**
 * 한 기간 결제. 같은 기간은 같은 주문번호라 두 번 결제되지 않는다.
 * 토스는 결제했는데 우리 기록이 빠진 경우(중복 주문 오류)에는 주문번호로 조회해 맞춘다.
 */
async function chargePeriod(
  sub: SubRow,
  billingKey: string,
  periodStart: Date,
  periodEnd: Date,
  customer: { email?: string; name?: string },
): Promise<ChargeResult> {
  const orderId = buildOrderId(sub.id, periodStart);
  const existing = await prisma.subscriptionPayment.findUnique({ where: { orderId } });
  if (existing?.status === "DONE") return { ok: true };
  if (!existing) {
    await prisma.subscriptionPayment.create({
      data: { subscriptionId: sub.id, orderId, amount: sub.amount, status: "PENDING", periodStart, periodEnd },
    });
  }

  let payment: TossPayment | null = null;
  let failureCode: string | undefined;
  let failureMessage: string | undefined;
  try {
    payment = await chargeBilling({
      billingKey,
      customerKey: sub.customerKey,
      amount: sub.amount,
      orderId,
      orderName: MONTHLY_PLAN.name,
      customerEmail: customer.email,
      customerName: customer.name,
    });
  } catch (err) {
    if (err instanceof TossError && /ALREADY_PROCESSED|DUPLICATED_ORDER/.test(err.code)) {
      try {
        payment = await getPaymentByOrderId(orderId);
      } catch {
        /* 아래에서 실패로 기록 */
      }
    }
    if (!payment) {
      failureCode = err instanceof TossError ? err.code : "UNKNOWN";
      failureMessage = err instanceof Error ? err.message : "결제 실패";
    }
  }

  if (payment && payment.status === "DONE") {
    await prisma.subscriptionPayment.update({
      where: { orderId },
      data: {
        status: "DONE",
        paymentKey: payment.paymentKey,
        approvedAt: payment.approvedAt ? new Date(payment.approvedAt) : new Date(),
        receiptUrl: payment.receipt?.url ?? null,
        failureCode: null,
        failureMessage: null,
      },
    });
    return { ok: true, payment };
  }

  await prisma.subscriptionPayment.update({
    where: { orderId },
    data: {
      status: "FAILED",
      failureCode: failureCode ?? `STATUS_${payment?.status ?? "UNKNOWN"}`,
      failureMessage: failureMessage ?? "결제가 완료되지 않았습니다",
    },
  });
  return { ok: false, failureCode, failureMessage };
}

/**
 * 카드 등록 완료(토스 successUrl) → billingKey 발급 → 첫 달 결제 → 이용권 시작.
 * 무료 기간(관리자 부여)이 남아 있으면 그 기간이 끝난 뒤부터 이어서 한 달.
 */
export async function activateWithCard(opts: {
  dentistId: string;
  authKey: string;
  customerKey: string;
  customerEmail?: string;
  customerName?: string;
}): Promise<{ periodEnd: Date }> {
  const sub = await getOrCreateSubscription(opts.dentistId);
  if (sub.customerKey !== opts.customerKey) {
    throw new SubscriptionError("CUSTOMER_MISMATCH", "결제 정보가 일치하지 않습니다");
  }

  const issued = await issueBillingKey(opts.authKey, opts.customerKey);
  const now = new Date();
  const base =
    isSubscriptionActive(sub, now) && sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
  const periodEnd = addMonthsKst(base, 1);

  const result = await chargePeriod(sub, issued.billingKey, base, periodEnd, {
    email: opts.customerEmail,
    name: opts.customerName,
  });
  if (!result.ok) {
    throw new SubscriptionError(result.failureCode ?? "CHARGE_FAILED", result.failureMessage ?? "결제에 실패했습니다");
  }

  await prisma.dentistSubscription.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      source: "TOSS_BILLING",
      amount: MONTHLY_PLAN.amount,
      billingKeyEnc: sealSecret(issued.billingKey),
      cardSummary: summarizeCard(issued.cardCompany ?? issued.card?.issuerCode, issued.cardNumber ?? issued.card?.number),
      currentPeriodStart: sub.currentPeriodStart && base !== now ? sub.currentPeriodStart : base,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      failedCount: 0,
      lastFailure: null,
    },
  });
  return { periodEnd };
}

/** 해지 — 다음 결제부터 멈추고, 이미 낸 기간 끝까지는 쓴다 */
export async function cancelAtPeriodEnd(dentistId: string) {
  const sub = await prisma.dentistSubscription.findUnique({ where: { dentistId } });
  if (!sub || !isSubscriptionActive(sub)) throw new SubscriptionError("NOT_ACTIVE", "이용 중인 이용권이 없습니다");
  return prisma.dentistSubscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
  });
}

/** 해지 취소 — 기간이 남아 있고 등록 카드가 있을 때만 */
export async function resumeSubscription(dentistId: string) {
  const sub = await prisma.dentistSubscription.findUnique({ where: { dentistId } });
  if (!sub || !isSubscriptionActive(sub) || !sub.billingKeyEnc) {
    throw new SubscriptionError("NOT_RESUMABLE", "다시 이어갈 이용권이 없습니다. 새로 등록해 주세요");
  }
  return prisma.dentistSubscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: false, canceledAt: null, status: sub.status === "CANCELED" ? "ACTIVE" : sub.status },
  });
}

/** 관리자: 결제 없이 이용 기간 부여 (남은 기간 뒤에 이어 붙인다) */
export async function grantMonths(dentistId: string, months: number) {
  const sub = await getOrCreateSubscription(dentistId);
  const now = new Date();
  const base = isSubscriptionActive(sub, now) && sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
  return prisma.dentistSubscription.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      // 등록된 카드가 있으면 자동결제는 늘어난 기간 끝에서 이어진다
      source: sub.billingKeyEnc ? "TOSS_BILLING" : "ADMIN_GRANT",
      currentPeriodStart: sub.currentPeriodStart && base !== now ? sub.currentPeriodStart : now,
      currentPeriodEnd: addMonthsKst(base, months),
      failedCount: 0,
      lastFailure: null,
    },
  });
}

export interface RenewalSummary {
  renewed: number;
  failed: number;
  canceled: number;
  expired: number;
}

/** 매일 cron — 갱신 결제, 해지·무료 기간 종료, 재시도 초과 만료 */
export async function runSubscriptionJob(now: Date = new Date()): Promise<RenewalSummary> {
  const summary: RenewalSummary = { renewed: 0, failed: 0, canceled: 0, expired: 0 };

  // 1) 해지 예약 + 기간 끝 → CANCELED (카드 정보 삭제)
  const canceled = await prisma.dentistSubscription.updateMany({
    where: { cancelAtPeriodEnd: true, status: { in: ["ACTIVE", "PAST_DUE"] }, currentPeriodEnd: { lte: now } },
    data: { status: "CANCELED", billingKeyEnc: null },
  });
  summary.canceled = canceled.count;

  // 2) 카드 없는 무료 기간 끝 → EXPIRED
  const expiredGrant = await prisma.dentistSubscription.updateMany({
    where: { status: "ACTIVE", billingKeyEnc: null, currentPeriodEnd: { lte: now } },
    data: { status: "EXPIRED" },
  });
  summary.expired += expiredGrant.count;

  // 3) 재시도 초과 → EXPIRED (카드 정보 삭제)
  const expiredFail = await prisma.dentistSubscription.updateMany({
    where: { status: "PAST_DUE", failedCount: { gte: MAX_RENEWAL_FAILURES } },
    data: { status: "EXPIRED", billingKeyEnc: null },
  });
  summary.expired += expiredFail.count;

  // 4) 갱신 결제
  const candidates = await prisma.dentistSubscription.findMany({
    where: {
      source: "TOSS_BILLING",
      status: { in: ["ACTIVE", "PAST_DUE"] },
      cancelAtPeriodEnd: false,
      billingKeyEnc: { not: null },
    },
    include: { dentist: { select: { user: { select: { email: true, name: true } } } } },
  });
  for (const sub of candidates) {
    if (!isDueForRenewal(sub, now) || !sub.currentPeriodEnd || !sub.billingKeyEnc) continue;
    const periodStart = sub.currentPeriodEnd;
    const periodEnd = addMonthsKst(periodStart, 1);
    let ok = false;
    let reason = "";
    try {
      const r = await chargePeriod(sub, openSecret(sub.billingKeyEnc), periodStart, periodEnd, {
        email: sub.dentist.user.email,
        name: sub.dentist.user.name,
      });
      ok = r.ok;
      reason = [r.failureCode, r.failureMessage].filter(Boolean).join(" ");
    } catch (err) {
      reason = err instanceof Error ? err.message : "갱신 실패";
    }
    if (ok) {
      await prisma.dentistSubscription.update({
        where: { id: sub.id },
        data: { status: "ACTIVE", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, failedCount: 0, lastFailure: null },
      });
      summary.renewed++;
    } else {
      await prisma.dentistSubscription.update({
        where: { id: sub.id },
        data: {
          status: periodStart <= now ? "PAST_DUE" : sub.status,
          failedCount: { increment: 1 },
          lastFailure: reason.slice(0, 500) || "갱신 실패",
        },
      });
      summary.failed++;
    }
  }
  return summary;
}
