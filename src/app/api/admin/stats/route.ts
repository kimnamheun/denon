// 관리자: 통계 / 대시보드 데이터
// GET /api/admin/stats

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { kstEndOfDay, kstStartOfDay } from "@/lib/kst";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const [
    totalUsers,
    patients,
    dentists,
    unverifiedDentists,
    clinics,
    premiumClinics,
    openRequests,
    pendingQuotations,
    todayConsultations,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: "PATIENT", deletedAt: null } }),
    prisma.user.count({ where: { role: "DENTIST", deletedAt: null } }),
    prisma.dentist.count({ where: { isVerified: false } }),
    prisma.clinic.count({ where: { deletedAt: null } }),
    prisma.clinic.count({ where: { isPremium: true, deletedAt: null } }),
    prisma.quotationRequest.count({ where: { status: "OPEN", deletedAt: null } }),
    prisma.quotation.count({ where: { status: "PENDING", deletedAt: null } }),
    prisma.consultation.count({
      where: {
        scheduledAt: {
          gte: kstStartOfDay(),
          lt: kstEndOfDay(),
        },
      },
    }),
  ]);

  return NextResponse.json({
    totalUsers,
    patients,
    dentists,
    unverifiedDentists,
    clinics,
    premiumClinics,
    openRequests,
    pendingQuotations,
    todayConsultations,
  });
}
