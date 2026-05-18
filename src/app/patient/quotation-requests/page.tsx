import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const URGENCY_LABEL: Record<string, string> = {
  LOW: "여유롭게",
  MEDIUM: "보통",
  HIGH: "시급",
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  OPEN: { label: "견적 받는 중", className: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "진행 중", className: "bg-amber-100 text-amber-700" },
  CLOSED: { label: "종료", className: "bg-gray-100 text-gray-700" },
  EXPIRED: { label: "만료", className: "bg-red-100 text-red-700" },
};

export default async function MyQuotationRequestsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const requests = await prisma.quotationRequest.findMany({
    where: { patientId: session.user.id, deletedAt: null },
    include: {
      missingTeeth: true,
      _count: { select: { quotations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="container max-w-4xl py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">내 견적 요청</h1>
          <p className="text-muted-foreground mt-2">
            제출한 견적 요청과 받은 견적서를 확인하세요
          </p>
        </div>
        <Link href="/patient/quotation-requests/new">
          <Button>새 요청</Button>
        </Link>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            아직 견적 요청이 없습니다.
            <div className="mt-4">
              <Link href="/patient/quotation-requests/new">
                <Button>첫 견적 요청 만들기</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const status = STATUS_LABEL[r.status] ?? STATUS_LABEL.OPEN;
            return (
              <Link key={r.id} href={`/patient/quotation-requests/${r.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {r.symptoms ? r.symptoms.slice(0, 50) + (r.symptoms.length > 50 ? "..." : "") : "(증상 미입력)"}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {new Date(r.createdAt).toLocaleDateString("ko-KR")} ·
                          긴급도: {URGENCY_LABEL[r.urgency]} ·
                          치아 {r.missingTeeth.length}개
                        </CardDescription>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      받은 견적서:{" "}
                      <span className="font-semibold">{r._count.quotations}건</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
