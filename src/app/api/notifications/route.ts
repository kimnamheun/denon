// 알림 동적 생성 (DB 알림 테이블 없이 비즈니스 이벤트로 즉시 계산)
// GET /api/notifications
//
// 환자: PENDING 견적서 도착, 다가오는 예약 (24시간 이내)
// 의사: OPEN 견적 요청 (응답 가능), ACCEPTED 견적서
// 관리자: 인증 대기 의사

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  desc: string;
  href: string;
  at: string;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ items: [], unreadCount: 0 });

  const items: NotificationItem[] = [];

  if (session.user.role === "PATIENT") {
    const [pendingQuotations, upcomingAppointments] = await Promise.all([
      prisma.quotation.findMany({
        where: {
          request: { patientId: session.user.id },
          status: "PENDING",
          deletedAt: null,
        },
        select: {
          id: true,
          createdAt: true,
          finalAmount: true,
          clinic: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.consultation.findMany({
        where: {
          patientId: session.user.id,
          status: "SCHEDULED",
          scheduledAt: {
            gte: new Date(),
            lt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        },
        select: {
          id: true,
          scheduledAt: true,
          clinic: { select: { name: true } },
        },
        orderBy: { scheduledAt: "asc" },
      }),
    ]);

    for (const q of pendingQuotations) {
      items.push({
        id: `q-${q.id}`,
        type: "QUOTATION",
        title: "새 견적서 도착",
        desc: `${q.clinic.name} · ${Number(q.finalAmount).toLocaleString("ko-KR")}원`,
        href: `/patient/quotations/${q.id}`,
        at: q.createdAt.toISOString(),
      });
    }
    for (const c of upcomingAppointments) {
      items.push({
        id: `a-${c.id}`,
        type: "APPOINTMENT",
        title: "다가오는 예약",
        desc: `${c.clinic.name} · ${new Date(c.scheduledAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
        href: `/patient/appointments/${c.id}`,
        at: c.scheduledAt.toISOString(),
      });
    }
  } else if (session.user.role === "DENTIST") {
    const [openRequests, acceptedQuotations] = await Promise.all([
      prisma.quotationRequest.findMany({
        where: {
          status: "OPEN",
          deletedAt: null,
          quotations: { none: { dentistId: session.user.id, deletedAt: null } },
        },
        select: {
          id: true,
          createdAt: true,
          urgency: true,
          missingTeeth: { select: { toothNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.quotation.findMany({
        where: { dentistId: session.user.id, status: "ACCEPTED", deletedAt: null },
        select: {
          id: true,
          updatedAt: true,
          request: {
            select: { patient: { include: { user: { select: { name: true } } } } },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    for (const r of openRequests) {
      items.push({
        id: `r-${r.id}`,
        type: "REQUEST",
        title: r.urgency === "HIGH" ? "🔥 시급 견적 요청" : "신규 견적 요청",
        desc: `치아 ${r.missingTeeth.length}개 임플란트`,
        href: `/dentist/quotation-requests/${r.id}`,
        at: r.createdAt.toISOString(),
      });
    }
    for (const q of acceptedQuotations) {
      items.push({
        id: `qa-${q.id}`,
        type: "ACCEPTED",
        title: "🎉 견적서 수락됨",
        desc: `${q.request.patient.user.name} 님이 견적을 수락하셨습니다`,
        href: `/dentist/quotations/${q.id}`,
        at: q.updatedAt.toISOString(),
      });
    }
  } else if (session.user.role === "ADMIN") {
    const unverifiedDentists = await prisma.dentist.findMany({
      where: { isVerified: false },
      select: {
        id: true,
        licenseNumber: true,
        user: { select: { name: true, createdAt: true } },
      },
      take: 5,
    });
    for (const d of unverifiedDentists) {
      items.push({
        id: `d-${d.id}`,
        type: "VERIFY",
        title: "치과의사 인증 대기",
        desc: `${d.user.name} (${d.licenseNumber})`,
        href: `/admin/dentists`,
        at: d.user.createdAt.toISOString(),
      });
    }
  }

  // 최신순 정렬
  items.sort((a, b) => b.at.localeCompare(a.at));

  return NextResponse.json({ items: items.slice(0, 10), unreadCount: items.length });
}
