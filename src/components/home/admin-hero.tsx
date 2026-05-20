import Link from "next/link";
import { Users, ShieldCheck, Building, BarChart3 } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  userName: string;
}

export async function AdminHero({ userName }: Props) {
  const [totalUsers, unverifiedDentists, totalClinics, openRequests, pendingQuotations, recentUsers] =
    await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.dentist.count({ where: { isVerified: false } }),
      prisma.clinic.count({ where: { deletedAt: null } }),
      prisma.quotationRequest.count({ where: { status: "OPEN", deletedAt: null } }),
      prisma.quotation.count({ where: { status: "PENDING", deletedAt: null } }),
      prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
    ]);

  return (
    <section className="bg-gradient-to-br from-purple-50 via-white to-blue-50 border-b">
      <div className="container max-w-5xl py-8 md:py-12">
        <div className="mb-6">
          <p className="text-base text-muted-foreground">관리자</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">{userName} 님</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatLink href="/admin/users" icon={<Users className="h-5 w-5" />} value={totalUsers} label="전체 사용자" />
          <StatLink
            href="/admin/dentists"
            icon={<ShieldCheck className="h-5 w-5" />}
            value={unverifiedDentists}
            label="인증 대기 의사"
            highlight={unverifiedDentists > 0}
          />
          <StatLink href="/admin/clinics" icon={<Building className="h-5 w-5" />} value={totalClinics} label="등록 병원" />
          <StatLink
            href="/admin/dashboard"
            icon={<BarChart3 className="h-5 w-5" />}
            value={openRequests + pendingQuotations}
            label="활성 견적"
          />
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold flex items-center gap-2">
                <Users className="h-5 w-5" /> 최근 가입자
              </h2>
              <Link href="/admin/users" className="text-base text-blue-600 hover:underline">
                전체보기 →
              </Link>
            </div>
            <ul className="space-y-2 text-base">
              {recentUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.name}</span>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-secondary">{u.role}</span>
                    <span className="text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
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
          highlight ? "border-red-300 bg-red-50/50" : ""
        }`}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            {icon}
            <span className="text-xs">{label}</span>
          </div>
          <div className="text-2xl font-bold">{value.toLocaleString("ko-KR")}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
