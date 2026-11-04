// 관리자: 의사 월 이용권 현황 + 무료 기간 부여

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { MONTHLY_PLAN, formatWon, isSubscriptionActive, subscriptionEnforced } from "@/lib/subscription";
import { tossConfigured } from "@/lib/toss";
import { canSealSecrets } from "@/lib/crypto-box";
import { GrantButtons } from "./grant-buttons";

const kstDate = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "-";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "카드 미등록",
  ACTIVE: "이용 중",
  PAST_DUE: "결제 실패",
  CANCELED: "해지",
  EXPIRED: "만료",
};

export default async function AdminSubscriptionsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;

  const now = new Date();
  // 서울 기준 이번 달 1일 00:00
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const monthStart = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1) - 9 * 3600_000);
  const [dentists, doneThisMonth] = await Promise.all([
    prisma.dentist.findMany({
      where: { isVerified: true },
      select: {
        id: true,
        licenseNumber: true,
        user: { select: { name: true } },
        clinic: { select: { name: true } },
        subscription: {
          select: {
            status: true,
            source: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            cardSummary: true,
            lastFailure: true,
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.subscriptionPayment.aggregate({
      where: { status: "DONE", approvedAt: { gte: monthStart } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);
  const activeCount = dentists.filter((d) => isSubscriptionActive(d.subscription, now)).length;

  return (
    <main className="container max-w-5xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">월 이용권</h1>
        <p className="mt-1 text-muted-foreground">
          {MONTHLY_PLAN.name} {formatWon(MONTHLY_PLAN.amount)}/월 · 인증 의사 {dentists.length}명 중 이용 중 {activeCount}명 · 이번 달 결제{" "}
          {doneThisMonth._count._all}건 {formatWon(doneThisMonth._sum.amount ?? 0)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className={`rounded px-2 py-1 ${subscriptionEnforced() ? "bg-red-100 text-red-800" : "bg-muted"}`}>
            이용권 필수: {subscriptionEnforced() ? "켜짐 — 이용권 없는 의사는 견적 요청을 못 봅니다" : "꺼짐 (SUBSCRIPTION_ENFORCED)"}
          </span>
          <span className={`rounded px-2 py-1 ${tossConfigured() && canSealSecrets() ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
            카드 결제: {tossConfigured() && canSealSecrets() ? "준비됨" : "준비 안 됨 (TOSS_CLIENT_KEY·TOSS_SECRET_KEY·BILLING_KEY_SECRET)"}
          </span>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-left">의사</th>
                <th className="p-3 text-left">병원</th>
                <th className="p-3 text-left">상태</th>
                <th className="p-3 text-left">기간 끝</th>
                <th className="p-3 text-left">카드</th>
                <th className="p-3 text-right">무료 기간 부여</th>
              </tr>
            </thead>
            <tbody>
              {dentists.map((d) => {
                const s = d.subscription;
                const active = isSubscriptionActive(s, now);
                return (
                  <tr key={d.id} className="border-t align-top">
                    <td className="p-3">
                      <div className="font-medium">{d.user.name}</div>
                      <div className="text-xs text-muted-foreground">면허 {d.licenseNumber}</div>
                    </td>
                    <td className="p-3">{d.clinic?.name ?? "-"}</td>
                    <td className="p-3">
                      <span className={active ? "text-emerald-700" : "text-muted-foreground"}>
                        {s ? STATUS_LABEL[s.status] : "없음"}
                        {s?.source === "ADMIN_GRANT" && " (무료)"}
                        {s?.cancelAtPeriodEnd && " · 해지 예약"}
                      </span>
                      {s?.status === "PAST_DUE" && s.lastFailure && (
                        <div className="text-xs text-red-700">{s.lastFailure}</div>
                      )}
                    </td>
                    <td className="p-3">{kstDate(s?.currentPeriodEnd)}</td>
                    <td className="p-3 text-xs">{s?.cardSummary ?? "-"}</td>
                    <td className="p-3 text-right">
                      <GrantButtons dentistId={d.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}
