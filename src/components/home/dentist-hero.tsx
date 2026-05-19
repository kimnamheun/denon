import Link from "next/link";
import { TrendingUp, FileText, Calendar, Star } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { maskName, formatBudgetRange, timeAgo } from "@/lib/anonymize";

interface Props {
  userId: string;
  userName: string;
}

const URGENCY_BADGE: Record<string, { label: string; className: string }> = {
  LOW: { label: "여유", className: "bg-gray-100 text-gray-700" },
  MEDIUM: { label: "보통", className: "bg-amber-100 text-amber-700" },
  HIGH: { label: "시급", className: "bg-red-100 text-red-700" },
};

export async function DentistHero({ userId, userName }: Props) {
  const [
    availableRequests,
    pendingMyQuotations,
    todayConsultations,
    newReviews,
    topRequests,
    todayAppointments,
  ] = await Promise.all([
    // 본인이 아직 견적 안 낸 OPEN 요청 수
    prisma.quotationRequest.count({
      where: {
        status: "OPEN",
        deletedAt: null,
        quotations: { none: { dentistId: userId, deletedAt: null } },
      },
    }),
    prisma.quotation.count({
      where: { dentistId: userId, status: "PENDING", deletedAt: null },
    }),
    prisma.consultation.count({
      where: {
        dentistId: userId,
        status: "SCHEDULED",
        scheduledAt: { gte: startOfDay(), lt: endOfDay() },
      },
    }),
    prisma.review.count({
      where: {
        dentistId: userId,
        deletedAt: null,
        createdAt: { gte: weekAgo() },
      },
    }),
    // 응답 가능한 신규 요청 6건
    prisma.quotationRequest.findMany({
      where: {
        status: "OPEN",
        deletedAt: null,
        quotations: { none: { dentistId: userId, deletedAt: null } },
      },
      include: {
        missingTeeth: true,
        patient: { include: { user: { select: { name: true } } } },
      },
      orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    // 오늘 상담 일정
    prisma.consultation.findMany({
      where: {
        dentistId: userId,
        scheduledAt: { gte: startOfDay(), lt: endOfDay() },
      },
      include: {
        patient: { include: { user: { select: { name: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
  ]);

  return (
    <section className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 border-b">
      <div className="container max-w-5xl py-8 md:py-12">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">안녕하세요</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">{userName} 원장님</h1>
        </div>

        {/* 통계 카드 4개 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatLink
            href="/dentist/quotation-requests/available"
            icon={<TrendingUp className="h-5 w-5" />}
            value={availableRequests}
            label="응답 가능한 요청"
            highlight={availableRequests > 0}
          />
          <StatLink
            href="/dentist/quotations/submitted"
            icon={<FileText className="h-5 w-5" />}
            value={pendingMyQuotations}
            label="검토 대기 견적"
          />
          <StatLink
            href="/dentist/appointments"
            icon={<Calendar className="h-5 w-5" />}
            value={todayConsultations}
            label="오늘 상담"
          />
          <StatLink
            href="/dentist/reviews"
            icon={<Star className="h-5 w-5" />}
            value={newReviews}
            label="이번 주 리뷰"
          />
        </div>

        {/* 오늘 상담 (있을 때만) */}
        {todayAppointments.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> 오늘 상담 일정
                </h2>
                <Link
                  href="/dentist/appointments"
                  className="text-sm text-blue-600 hover:underline"
                >
                  전체보기 →
                </Link>
              </div>
              <ul className="space-y-2">
                {todayAppointments.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between py-2 border-b last:border-0 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-blue-600 font-semibold">
                        {new Date(c.scheduledAt).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="font-medium">{c.patient.user.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {c.duration}분 · {c.status === "SCHEDULED" ? "예정" : c.status}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* 신규 견적 요청 */}
        {topRequests.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> 응답 가능한 요청
                <span className="text-sm font-normal text-muted-foreground">
                  ({availableRequests})
                </span>
              </h2>
              <Link
                href="/dentist/quotation-requests/available"
                className="text-sm text-blue-600 hover:underline"
              >
                전체보기 →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {topRequests.map((r) => {
                const urg = URGENCY_BADGE[r.urgency];
                return (
                  <Link key={r.id} href={`/dentist/quotation-requests/${r.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-medium">
                            치아 {r.missingTeeth.length}개
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${urg.className}`}
                          >
                            {urg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 min-h-[2.5rem]">
                          {r.symptoms ?? "(증상 미입력)"}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                          <span>{maskName(r.patient.user.name)} 님</span>
                          <span>
                            {formatBudgetRange(r.minBudget, r.maxBudget)} · {timeAgo(r.createdAt)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StatLink({
  href,
  icon,
  value,
  label,
  highlight,
}: {
  href: string;
  icon: React.ReactNode;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card
        className={`hover:shadow-md transition-all cursor-pointer h-full ${
          highlight ? "border-blue-300 bg-blue-50/50" : ""
        }`}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            {icon}
            <span className="text-xs">{label}</span>
          </div>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}
