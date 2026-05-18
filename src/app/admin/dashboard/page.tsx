import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;

  // 직접 prisma 쿼리 (API 호출 우회)
  const [
    totalUsers,
    patients,
    dentists,
    unverifiedDentists,
    clinics,
    premiumClinics,
    openRequests,
    pendingQuotations,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: "PATIENT", deletedAt: null } }),
    prisma.user.count({ where: { role: "DENTIST", deletedAt: null } }),
    prisma.dentist.count({ where: { isVerified: false } }),
    prisma.clinic.count({ where: { deletedAt: null } }),
    prisma.clinic.count({ where: { isPremium: true, deletedAt: null } }),
    prisma.quotationRequest.count({ where: { status: "OPEN", deletedAt: null } }),
    prisma.quotation.count({ where: { status: "PENDING", deletedAt: null } }),
  ]);

  return (
    <main className="container py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">관리자 대시보드</h1>
        <p className="text-muted-foreground mt-2">전체 시스템 운영 현황</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat title="전체 사용자" value={totalUsers} />
        <Stat title="환자" value={patients} />
        <Stat title="치과의사" value={dentists} subtitle={`${unverifiedDentists}명 미인증`} />
        <Stat title="병원" value={clinics} subtitle={`${premiumClinics}곳 프리미엄`} />
        <Stat title="열린 견적 요청" value={openRequests} />
        <Stat title="대기 견적서" value={pendingQuotations} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <NavCard
          href="/admin/users"
          title="사용자 관리"
          desc="사용자 목록, 검색, 상태 변경"
        />
        <NavCard
          href="/admin/dentists"
          title="치과의사 인증"
          desc={`${unverifiedDentists}명 인증 대기`}
        />
        <NavCard
          href="/admin/clinics"
          title="병원 관리"
          desc="프리미엄 관리, 정보 검토"
        />
      </div>
    </main>
  );
}

function Stat({ title, value, subtitle }: { title: string; value: number; subtitle?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value.toLocaleString("ko-KR")}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
