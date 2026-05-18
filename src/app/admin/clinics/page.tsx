import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { PremiumToggle } from "./premium-toggle";

export default async function AdminClinicsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;

  const clinics = await prisma.clinic.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { dentists: true, reviews: { where: { deletedAt: null } } } },
    },
    orderBy: [{ isPremium: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main className="container py-10 space-y-4">
      <div>
        <h1 className="text-3xl font-bold">병원 관리</h1>
        <p className="text-muted-foreground mt-1">총 {clinics.length.toLocaleString()}곳</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left p-3">병원명</th>
                <th className="text-left p-3">주소</th>
                <th className="text-left p-3">사업자번호</th>
                <th className="text-right p-3">의사</th>
                <th className="text-right p-3">평점</th>
                <th className="text-right p-3">리뷰</th>
                <th className="text-center p-3">프리미엄</th>
                <th className="text-right p-3 pr-4">액션</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {c.sido} {c.sigungu} {c.dong}
                  </td>
                  <td className="p-3">{c.businessNumber}</td>
                  <td className="p-3 text-right">{c._count.dentists}</td>
                  <td className="p-3 text-right">{Number(c.rating).toFixed(1)}</td>
                  <td className="p-3 text-right">{c._count.reviews}</td>
                  <td className="p-3 text-center">
                    {c.isPremium ? (
                      <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">
                        프리미엄
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">일반</span>
                    )}
                  </td>
                  <td className="p-3 pr-4 text-right">
                    <PremiumToggle clinicId={c.id} isPremium={c.isPremium} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}
