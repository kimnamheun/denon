import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const URGENCY_BADGE: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-red-100 text-red-700",
};

const URGENCY_LABEL: Record<string, string> = {
  LOW: "여유롭게",
  MEDIUM: "보통",
  HIGH: "시급",
};

export default async function AvailableRequestsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DENTIST") return null;

  // 본인이 이미 견적서를 낸 요청은 제외
  const requests = await prisma.quotationRequest.findMany({
    where: {
      status: "OPEN",
      deletedAt: null,
      quotations: { none: { dentistId: session.user.id, deletedAt: null } },
    },
    include: {
      missingTeeth: true,
      _count: { select: { quotations: true } },
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <main className="container max-w-5xl py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">견적 요청 목록</h1>
        <p className="text-muted-foreground mt-2">
          환자가 올린 견적 요청을 확인하고 견적서를 작성하세요
        </p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            현재 응답 가능한 견적 요청이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requests.map((r) => (
            <Link key={r.id} href={`/dentist/quotation-requests/${r.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex-1">
                      치아 {r.missingTeeth.length}개 임플란트
                    </CardTitle>
                    <span
                      className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                        URGENCY_BADGE[r.urgency]
                      }`}
                    >
                      {URGENCY_LABEL[r.urgency]}
                    </span>
                  </div>
                  <CardDescription>
                    {new Date(r.createdAt).toLocaleDateString("ko-KR")} · 견적{" "}
                    {r._count.quotations}건 경합 중
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-base line-clamp-3 text-muted-foreground">
                    {r.symptoms ?? "(증상 미입력)"}
                  </p>
                  <div className="mt-3 text-xs text-muted-foreground">
                    예산: {r.minBudget?.toLocaleString("ko-KR") ?? "-"} ~{" "}
                    {r.maxBudget?.toLocaleString("ko-KR") ?? "-"}원
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
