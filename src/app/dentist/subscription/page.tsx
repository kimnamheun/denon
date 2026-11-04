// 의사: 월 이용권 — 상태·결제 내역·등록/해지

import { CreditCard, ReceiptText } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MONTHLY_PLAN, PAST_DUE_GRACE_DAYS, formatWon, isSubscriptionActive, subscriptionEnforced } from "@/lib/subscription";
import { tossConfigured } from "@/lib/toss";
import { canSealSecrets } from "@/lib/crypto-box";
import { SubscribeButton, CancelButton, ResumeButton } from "./subscription-actions";

const kstDate = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }) : "-";

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  DONE: { label: "결제 완료", className: "text-emerald-700" },
  FAILED: { label: "실패", className: "text-red-700" },
  PENDING: { label: "처리 중", className: "text-muted-foreground" },
};

export default async function DentistSubscriptionPage({
  searchParams,
}: {
  searchParams: { billing?: string; message?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DENTIST") return null;

  const [dentist, sub] = await Promise.all([
    prisma.dentist.findUnique({ where: { id: session.user.id }, select: { isVerified: true } }),
    prisma.dentistSubscription.findUnique({
      where: { dentistId: session.user.id },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 24 } },
    }),
  ]);
  const active = isSubscriptionActive(sub);
  const enforced = subscriptionEnforced();
  const billingReady = tossConfigured() && canSealSecrets();
  const hasCard = Boolean(sub?.billingKeyEnc);

  return (
    <main className="container max-w-3xl space-y-5 py-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">월 이용권</h1>
        <p className="mt-1 text-base text-muted-foreground">
          환자 견적 요청 열람, 견적서 보내기, 상담 문의에 쓰는 이용권입니다. 술식 학습은 이용권 없이 쓸 수 있습니다.
        </p>
      </div>

      {searchParams.billing === "success" && (
        <p className="rounded-lg bg-emerald-50 p-4 text-base text-emerald-800">카드 등록과 첫 결제가 끝났습니다.</p>
      )}
      {searchParams.billing === "fail" && (
        <p className="rounded-lg bg-destructive/10 p-4 text-base text-destructive">
          카드 등록·결제에 실패했습니다. {searchParams.message ?? ""}
        </p>
      )}
      {!enforced && (
        <p className="rounded-lg bg-blue-50 p-4 text-base text-blue-900">
          지금은 시범 운영 기간이라 이용권 없이도 견적 요청을 이용할 수 있습니다.
        </p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="h-6 w-6" /> {MONTHLY_PLAN.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-3xl font-bold">
            {formatWon(MONTHLY_PLAN.amount)}
            <span className="ml-1 text-base font-normal text-muted-foreground">/ 월 (부가세 포함)</span>
          </p>

          <StatusBlock
            status={sub?.status ?? null}
            source={sub?.source ?? null}
            active={active}
            cancelAtPeriodEnd={sub?.cancelAtPeriodEnd ?? false}
            periodEnd={sub?.currentPeriodEnd ?? null}
            cardSummary={sub?.cardSummary ?? null}
            lastFailure={sub?.lastFailure ?? null}
          />

          {!dentist?.isVerified ? (
            <p className="rounded-md bg-amber-50 p-3 text-base text-amber-800">면허 인증이 끝난 뒤 등록할 수 있습니다.</p>
          ) : active && hasCard && !sub?.cancelAtPeriodEnd ? (
            <CancelButton />
          ) : active && hasCard && sub?.cancelAtPeriodEnd ? (
            <ResumeButton />
          ) : billingReady ? (
            <SubscribeButton label={active ? "카드 등록하고 이어서 쓰기" : "카드 등록하고 시작하기"} />
          ) : (
            <p className="rounded-md bg-muted p-3 text-base text-muted-foreground">
              카드 결제 준비 중입니다. 관리자에게 문의해 주세요.
            </p>
          )}

          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>· 등록한 날부터 한 달씩, 매월 같은 날에 등록 카드로 {formatWon(MONTHLY_PLAN.amount)}이 자동 결제됩니다.</li>
            <li>· 언제든 해지할 수 있고, 해지해도 이미 결제한 기간 끝까지 쓸 수 있습니다.</li>
            <li>· 갱신 결제가 실패하면 {PAST_DUE_GRACE_DAYS}일 동안 계속 쓰면서 다시 결제를 시도합니다.</li>
            <li>· 환불 기준은 이용약관을 따릅니다.</li>
          </ul>
        </CardContent>
      </Card>

      {sub && sub.payments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ReceiptText className="h-5 w-5" /> 결제 내역
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {sub.payments.map((p) => {
                const s = PAYMENT_STATUS[p.status];
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-6 py-3 text-base">
                    <div className="min-w-0">
                      <p>
                        {kstDate(p.periodStart)} ~ {kstDate(p.periodEnd)}
                      </p>
                      {p.status === "FAILED" && p.failureMessage && (
                        <p className="text-sm text-red-700">{p.failureMessage}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">{formatWon(p.amount)}</p>
                      <p className={`text-sm ${s.className}`}>
                        {s.label}
                        {p.receiptUrl && (
                          <>
                            {" · "}
                            <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                              영수증
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function StatusBlock(props: {
  status: string | null;
  source: string | null;
  active: boolean;
  cancelAtPeriodEnd: boolean;
  periodEnd: Date | null;
  cardSummary: string | null;
  lastFailure: string | null;
}) {
  if (!props.status || props.status === "PENDING" || (!props.active && props.status !== "PAST_DUE")) {
    return <p className="text-base">이용 중인 이용권이 없습니다.</p>;
  }
  if (props.status === "PAST_DUE") {
    return (
      <div className="rounded-md bg-red-50 p-3 text-base text-red-800">
        <p className="font-semibold">갱신 결제가 실패했습니다</p>
        {props.lastFailure && <p className="text-sm">{props.lastFailure}</p>}
        <p className="text-sm">카드를 다시 등록하면 바로 이어서 쓸 수 있습니다.</p>
      </div>
    );
  }
  return (
    <dl className="grid grid-cols-[110px_1fr] gap-y-1 text-base">
      <dt className="text-muted-foreground">상태</dt>
      <dd className="font-semibold text-emerald-700">
        {props.source === "ADMIN_GRANT" ? "무료 이용 중" : props.cancelAtPeriodEnd ? "해지 예약" : "이용 중"}
      </dd>
      <dt className="text-muted-foreground">{props.cancelAtPeriodEnd || props.source === "ADMIN_GRANT" ? "이용 종료" : "다음 결제"}</dt>
      <dd>{kstDate(props.periodEnd)}</dd>
      {props.cardSummary && (
        <>
          <dt className="text-muted-foreground">결제 카드</dt>
          <dd>{props.cardSummary}</dd>
        </>
      )}
    </dl>
  );
}
