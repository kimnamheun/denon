import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function PatientDashboardPage() {
  const session = await auth();

  return (
    <main className="container py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">환자 대시보드</h1>
        <p className="text-muted-foreground mt-2">
          안녕하세요, {session?.user?.name}님
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashCard title="견적 요청" desc="새 임플란트 견적 받기" href="/patient/quotation-requests/new" />
        <DashCard title="받은 견적서" desc="치과의 견적 비교" href="/patient/quotations" />
        <DashCard title="상담 예약" desc="예약 현황 확인" href="/patient/appointments" />
        <DashCard title="병원 검색" desc="주변 치과 찾기" href="/clinics/search" />
        <DashCard title="치료 이력" desc="과거 치료 기록" href="/patient/treatment-history" />
        <DashCard title="내 프로필" desc="개인정보 수정" href="/patient/profile" />
      </div>
    </main>
  );
}

function DashCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href}>
      <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer h-full">
        <h2 className="font-semibold mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}
