import { auth } from "@/auth";
import Link from "next/link";

export default async function DentistDashboardPage() {
  const session = await auth();

  return (
    <main className="container py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">치과 대시보드</h1>
        <p className="text-muted-foreground mt-2">
          안녕하세요, {session?.user?.name} 원장님
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashCard title="견적 요청 목록" desc="환자의 견적 요청 검토" href="/dentist/quotation-requests/available" />
        <DashCard title="작성한 견적서" desc="제출 견적 관리" href="/dentist/quotations/submitted" />
        <DashCard title="상담 일정" desc="예약된 상담 관리" href="/dentist/appointments" />
        <DashCard title="환자 리뷰" desc="후기 확인" href="/dentist/reviews" />
        <DashCard title="병원 설정" desc="영업시간/위치 관리" href="/dentist/clinic-settings" />
        <DashCard title="내 프로필" desc="의사 정보 수정" href="/dentist/profile" />
      </div>
    </main>
  );
}

function DashCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href}>
      <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer h-full">
        <h2 className="font-semibold mb-1">{title}</h2>
        <p className="text-base text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}
