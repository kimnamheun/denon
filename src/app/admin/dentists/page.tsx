import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { VerifyButton } from "./verify-button";

export default async function AdminDentistsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;

  const dentists = await prisma.dentist.findMany({
    include: {
      user: { select: { name: true, email: true, status: true, createdAt: true } },
      clinic: { select: { id: true, name: true } },
    },
    orderBy: [{ isVerified: "asc" }, { user: { createdAt: "desc" } }],
  });

  return (
    <main className="container py-10 space-y-4">
      <div>
        <h1 className="text-3xl font-bold">치과의사 인증</h1>
        <p className="text-muted-foreground mt-1">면허번호와 정보를 검토하고 인증하세요</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-base">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left p-3">이름</th>
                <th className="text-left p-3">이메일</th>
                <th className="text-left p-3">면허번호</th>
                <th className="text-left p-3">전문분야</th>
                <th className="text-left p-3">소속 병원</th>
                <th className="text-left p-3">인증</th>
                <th className="text-right p-3 pr-4">액션</th>
              </tr>
            </thead>
            <tbody>
              {dentists.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3 font-medium">{d.user.name}</td>
                  <td className="p-3">{d.user.email}</td>
                  <td className="p-3">{d.licenseNumber}</td>
                  <td className="p-3">{d.specialization}</td>
                  <td className="p-3">
                    {d.clinic?.name ?? <span className="text-muted-foreground text-xs">미등록</span>}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        d.isVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {d.isVerified ? "✓ 인증" : "미인증"}
                    </span>
                  </td>
                  <td className="p-3 pr-4 text-right">
                    <VerifyButton dentistId={d.id} isVerified={d.isVerified} />
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
