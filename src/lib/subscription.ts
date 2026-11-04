// 의사 월 정액 이용권 규칙 (순수 함수 — 테스트 대상)
//
// - 금액은 여기 상수로만 정한다. 화면·요청에서 오는 금액은 쓰지 않는다.
// - 기간은 서울 달력 기준 한 달 (1/31 → 2/28·29 처럼 말일에 맞춘다).
// - 구독 필수 여부는 SUBSCRIPTION_ENFORCED=true 일 때만 켜진다 (법무 확인 후 켠다).

export const MONTHLY_PLAN = {
  code: "MONTHLY",
  name: "치과 월 이용권",
  /** 부가세 포함, 원 */
  amount: 9_900,
} as const;

/** 갱신 결제가 실패해도 이 기간 동안은 계속 쓸 수 있다 */
export const PAST_DUE_GRACE_DAYS = 3;
/** 갱신 결제를 이 횟수만큼 실패하면 만료 */
export const MAX_RENEWAL_FAILURES = 3;
/** 기간이 끝나기 이만큼 전부터 갱신 결제를 시도한다 (하루 1번 cron 이라 끊김 없이) */
export const RENEW_AHEAD_MS = 24 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function subscriptionEnforced(flag: string | undefined = process.env.SUBSCRIPTION_ENFORCED): boolean {
  return flag === "true";
}

/** 서울 달력 기준 n개월 뒤 같은 시각. 그 달에 같은 날이 없으면 말일 */
export function addMonthsKst(d: Date, months: number): Date {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  const y = k.getUTCFullYear();
  const m = k.getUTCMonth() + months;
  const day = k.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const target = new Date(
    Date.UTC(y, m, Math.min(day, lastDay), k.getUTCHours(), k.getUTCMinutes(), k.getUTCSeconds(), k.getUTCMilliseconds()),
  );
  return new Date(target.getTime() - KST_OFFSET_MS);
}

export interface SubscriptionLike {
  status: "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
  source?: "TOSS_BILLING" | "ADMIN_GRANT";
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd?: boolean;
  billingKeyEnc?: string | null;
  failedCount?: number;
}

/** 지금 이용권이 유효한가 */
export function isSubscriptionActive(sub: SubscriptionLike | null | undefined, now: Date = new Date()): boolean {
  if (!sub || !sub.currentPeriodEnd) return false;
  const end = sub.currentPeriodEnd.getTime();
  switch (sub.status) {
    case "ACTIVE":
    case "CANCELED": // 해지했어도 기간 끝까지는 쓴다
      return now.getTime() < end;
    case "PAST_DUE":
      return now.getTime() < end + PAST_DUE_GRACE_DAYS * DAY_MS;
    default:
      return false;
  }
}

/** 오늘 갱신 결제를 시도할 대상인가 */
export function isDueForRenewal(sub: SubscriptionLike, now: Date = new Date()): boolean {
  if (sub.source !== "TOSS_BILLING" || !sub.billingKeyEnc || sub.cancelAtPeriodEnd) return false;
  if (sub.status !== "ACTIVE" && sub.status !== "PAST_DUE") return false;
  if (!sub.currentPeriodEnd) return false;
  if ((sub.failedCount ?? 0) >= MAX_RENEWAL_FAILURES) return false;
  return sub.currentPeriodEnd.getTime() - now.getTime() <= RENEW_AHEAD_MS;
}

/**
 * 결제 주문번호 — 같은 이용권의 같은 기간이면 항상 같은 값.
 * 토스가 같은 주문번호의 두 번째 결제를 거절하므로, 재시도해도 한 기간을 두 번 결제하지 않는다.
 * (토스 규칙: 6~64자, 영문·숫자·-·_)
 */
export function buildOrderId(subscriptionId: string, periodStart: Date): string {
  const k = new Date(periodStart.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10).replace(/-/g, "");
  return `sub_${subscriptionId}_${k}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

/** 카드 표시: "신한 · 4330-12**-****-123*" 같은 형태 */
export function summarizeCard(company: string | null | undefined, number: string | null | undefined): string | null {
  const parts = [company, number].filter((x): x is string => Boolean(x && x.trim()));
  return parts.length ? parts.join(" · ").slice(0, 100) : null;
}

export function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}
