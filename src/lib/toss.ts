// 토스페이먼츠 카드 자동결제(빌링) — 서버 전용
//
// 환경변수
//   TOSS_CLIENT_KEY  — 결제창용 클라이언트 키 (화면에 내려줘도 되는 값)
//   TOSS_SECRET_KEY  — 서버 API 용 시크릿 키 (절대 화면에 내리지 않는다)
// 자동결제는 토스페이먼츠와 별도 계약이 필요하다. 테스트 키(test_ck_/test_sk_)로 먼저 확인한다.

const API = "https://api.tosspayments.com";

export class TossError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number,
  ) {
    super(message);
  }
}

export function tossConfigured(): boolean {
  return Boolean(process.env.TOSS_CLIENT_KEY && process.env.TOSS_SECRET_KEY);
}

export function tossClientKey(): string | null {
  return process.env.TOSS_CLIENT_KEY ?? null;
}

async function call<T>(path: string, init: { method: "GET" | "POST"; body?: unknown; idempotencyKey?: string }): Promise<T> {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) throw new TossError("NOT_CONFIGURED", "토스페이먼츠 키가 설정되지 않았습니다", 500);
  const res = await fetch(`${API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new TossError(String(data.code ?? "UNKNOWN"), String(data.message ?? "결제 요청 실패"), res.status);
  }
  return data as T;
}

export interface TossBillingKey {
  billingKey: string;
  customerKey: string;
  cardCompany?: string;
  cardNumber?: string;
  card?: { issuerCode?: string; number?: string; cardType?: string };
}

/** 카드 등록(authKey) → billingKey 발급 */
export function issueBillingKey(authKey: string, customerKey: string): Promise<TossBillingKey> {
  return call<TossBillingKey>("/v1/billing/authorizations/issue", {
    method: "POST",
    body: { authKey, customerKey },
  });
}

export interface TossPayment {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  approvedAt?: string;
  receipt?: { url?: string };
  card?: { number?: string; issuerCode?: string };
}

/** billingKey 로 결제 */
export function chargeBilling(opts: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
}): Promise<TossPayment> {
  const { billingKey, ...body } = opts;
  return call<TossPayment>(`/v1/billing/${encodeURIComponent(billingKey)}`, {
    method: "POST",
    body,
    idempotencyKey: opts.orderId,
  });
}

/** 주문번호로 결제 조회 — 결제는 됐는데 우리 DB 기록이 빠진 경우 맞추는 데 쓴다 */
export function getPaymentByOrderId(orderId: string): Promise<TossPayment> {
  return call<TossPayment>(`/v1/payments/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
}
