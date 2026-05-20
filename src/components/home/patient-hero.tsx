import Link from "next/link";
import { FileText, Inbox, Calendar, Plus, ArrowRight } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/anonymize";

interface Props {
  userId: string;
  userName: string;
}

export async function PatientHero({ userId, userName }: Props) {
  const [openRequests, pendingQuotations, upcomingAppointments, recentQuotations, nextAppointment] =
    await Promise.all([
      prisma.quotationRequest.count({
        where: { patientId: userId, status: "OPEN", deletedAt: null },
      }),
      prisma.quotation.count({
        where: {
          request: { patientId: userId },
          status: "PENDING",
          deletedAt: null,
        },
      }),
      prisma.consultation.count({
        where: {
          patientId: userId,
          status: "SCHEDULED",
          scheduledAt: { gte: new Date() },
        },
      }),
      prisma.quotation.findMany({
        where: {
          request: { patientId: userId },
          status: "PENDING",
          deletedAt: null,
        },
        include: {
          clinic: { select: { name: true } },
          dentist: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.consultation.findFirst({
        where: {
          patientId: userId,
          status: "SCHEDULED",
          scheduledAt: { gte: new Date() },
        },
        include: {
          clinic: { select: { id: true, name: true } },
          dentist: { include: { user: { select: { name: true } } } },
        },
        orderBy: { scheduledAt: "asc" },
      }),
    ]);

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 border-b">
      <div className="container max-w-5xl py-8 md:py-12">
        <div className="mb-6">
          <p className="text-base text-muted-foreground">안녕하세요</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">{userName} 님</h1>
        </div>

        {/* 빠른 액션 4개 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <QuickActionCard
            href="/patient/quotation-requests/new"
            icon={<Plus className="h-5 w-5" />}
            label="새 견적 요청"
            highlight
          />
          <QuickActionCard
            href="/patient/quotation-requests"
            icon={<FileText className="h-5 w-5" />}
            label="내 요청"
            badge={openRequests > 0 ? openRequests : undefined}
          />
          <QuickActionCard
            href="/patient/quotations"
            icon={<Inbox className="h-5 w-5" />}
            label="받은 견적"
            badge={pendingQuotations > 0 ? pendingQuotations : undefined}
          />
          <QuickActionCard
            href="/patient/appointments"
            icon={<Calendar className="h-5 w-5" />}
            label="예약"
            badge={upcomingAppointments > 0 ? upcomingAppointments : undefined}
          />
        </div>

        {/* 다음 예약 (있을 때만) */}
        {nextAppointment && (
          <Card className="mb-4 border-blue-200 bg-blue-50/50">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">다음 예약</p>
                  <p className="font-semibold">
                    {new Date(nextAppointment.scheduledAt).toLocaleString("ko-KR", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {nextAppointment.clinic.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nextAppointment.dentist.user.name} 원장
                  </p>
                </div>
              </div>
              <Link href={`/patient/appointments/${nextAppointment.id}`}>
                <Button variant="outline" size="sm">
                  상세
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 최근 받은 견적서 (있을 때만) */}
        {recentQuotations.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Inbox className="h-5 w-5" /> 최근 받은 견적서
              </h2>
              <Link href="/patient/quotations" className="text-base text-blue-600 hover:underline">
                전체보기 →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {recentQuotations.map((q) => (
                <Link key={q.id} href={`/patient/quotations/${q.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-3">
                      <div className="text-base font-semibold line-clamp-1">{q.clinic.name}</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {q.dentist.user.name} 원장 · {timeAgo(q.createdAt)}
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        {Number(q.finalAmount).toLocaleString("ko-KR")}원
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function QuickActionCard({
  href,
  icon,
  label,
  badge,
  highlight,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card
        className={`hover:shadow-md transition-all cursor-pointer h-full ${
          highlight ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" : ""
        }`}
      >
        <CardContent className="p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-base font-medium">{label}</span>
          </div>
          {badge !== undefined && (
            <span
              className={`text-xs font-bold rounded-full min-w-[1.5rem] h-6 px-2 flex items-center justify-center ${
                highlight ? "bg-white text-blue-600" : "bg-blue-600 text-white"
              }`}
            >
              {badge}
            </span>
          )}
          {highlight && badge === undefined && <ArrowRight className="h-4 w-4" />}
        </CardContent>
      </Card>
    </Link>
  );
}
