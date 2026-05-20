import Link from "next/link";
import { FileText, Inbox, Calendar, Star, Activity } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/anonymize";

interface Props {
  userId: string;
}

type TimelineItem = {
  id: string;
  type: "REQUEST" | "QUOTATION" | "APPOINTMENT" | "REVIEW";
  at: Date;
  title: string;
  desc: string;
  href: string;
};

export async function PatientTimeline({ userId }: Props) {
  const [requests, quotations, appointments, reviews] = await Promise.all([
    prisma.quotationRequest.findMany({
      where: { patientId: userId, deletedAt: null },
      select: { id: true, createdAt: true, missingTeeth: { select: { toothNumber: true } }, status: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.quotation.findMany({
      where: { request: { patientId: userId }, deletedAt: null },
      select: {
        id: true,
        createdAt: true,
        status: true,
        finalAmount: true,
        clinic: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.consultation.findMany({
      where: { patientId: userId },
      select: {
        id: true,
        createdAt: true,
        scheduledAt: true,
        status: true,
        clinic: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.review.findMany({
      where: { patientId: userId, deletedAt: null },
      select: {
        id: true,
        createdAt: true,
        rating: true,
        clinic: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const items: TimelineItem[] = [
    ...requests.map((r) => ({
      id: `req-${r.id}`,
      type: "REQUEST" as const,
      at: r.createdAt,
      title: "견적 요청 작성",
      desc: `치아 ${r.missingTeeth.length}개 임플란트 · ${r.status}`,
      href: `/patient/quotation-requests/${r.id}`,
    })),
    ...quotations.map((q) => ({
      id: `quo-${q.id}`,
      type: "QUOTATION" as const,
      at: q.createdAt,
      title: "견적서 수신",
      desc: `${q.clinic.name} · ${Number(q.finalAmount).toLocaleString("ko-KR")}원 · ${q.status}`,
      href: `/patient/quotations/${q.id}`,
    })),
    ...appointments.map((c) => ({
      id: `apt-${c.id}`,
      type: "APPOINTMENT" as const,
      at: c.createdAt,
      title: c.status === "COMPLETED" ? "상담 완료" : "상담 예약",
      desc: `${c.clinic.name} · ${new Date(c.scheduledAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      href: `/patient/appointments/${c.id}`,
    })),
    ...reviews.map((r) => ({
      id: `rev-${r.id}`,
      type: "REVIEW" as const,
      at: r.createdAt,
      title: "리뷰 작성",
      desc: `${r.clinic.name} · ${"★".repeat(r.rating)}`,
      href: `/clinics/${r.clinic.id}`,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  if (items.length === 0) return null;

  return (
    <section className="container max-w-5xl py-8">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5" /> 최근 활동
          </h2>
          <p className="text-base text-muted-foreground mt-0.5">내 견적·예약·리뷰 활동 타임라인</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="flex items-start gap-3 group">
                  <TimelineIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-base">
                      <span className="font-medium group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </span>
                      <span className="text-xs text-muted-foreground">· {timeAgo(item.at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.desc}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function TimelineIcon({ type }: { type: TimelineItem["type"] }) {
  const map: Record<TimelineItem["type"], { icon: React.ReactNode; className: string }> = {
    REQUEST: {
      icon: <FileText className="h-4 w-4" />,
      className: "bg-blue-100 text-blue-600",
    },
    QUOTATION: {
      icon: <Inbox className="h-4 w-4" />,
      className: "bg-emerald-100 text-emerald-600",
    },
    APPOINTMENT: {
      icon: <Calendar className="h-4 w-4" />,
      className: "bg-amber-100 text-amber-600",
    },
    REVIEW: {
      icon: <Star className="h-4 w-4" />,
      className: "bg-purple-100 text-purple-600",
    },
  };
  const m = map[type];
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.className}`}
    >
      {m.icon}
    </div>
  );
}
