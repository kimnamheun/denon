import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "임시저장", className: "bg-gray-100 text-gray-700" },
  PENDING: { label: "검토 중", className: "bg-blue-100 text-blue-700" },
  ACCEPTED: { label: "선택됨", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "거절됨", className: "bg-red-100 text-red-700" },
  EXPIRED: { label: "만료", className: "bg-gray-100 text-gray-500" },
  WITHDRAWN: { label: "철회", className: "bg-amber-100 text-amber-700" },
};

export default async function SubmittedQuotationsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DENTIST") return null;

  const quotations = await prisma.quotation.findMany({
    where: { dentistId: session.user.id, deletedAt: null },
    include: {
      request: {
        select: {
          id: true,
          symptoms: true,
          patient: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="container max-w-4xl py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">작성한 견적서</h1>
        <p className="text-muted-foreground mt-2">
          제출한 견적서의 상태를 확인하세요
        </p>
      </div>

      {quotations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            아직 작성한 견적서가 없습니다.
            <div className="mt-4">
              <Link
                href="/dentist/quotation-requests/available"
                className="text-primary hover:underline"
              >
                견적 요청 둘러보기
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotations.map((q) => {
            const status = STATUS_LABEL[q.status];
            return (
              <Link key={q.id} href={`/dentist/quotations/${q.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">
                          환자: {q.request.patient.user.name}
                        </CardTitle>
                        <CardDescription>
                          {new Date(q.createdAt).toLocaleDateString("ko-KR")} ·
                          치료 {q.treatmentDuration}개월 · 보증 {q.warrantyPeriod}년
                        </CardDescription>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-end">
                      <p className="text-base text-muted-foreground line-clamp-1 flex-1">
                        {q.request.symptoms ?? ""}
                      </p>
                      <div className="text-xl font-bold ml-3">
                        {q.finalAmount.toLocaleString("ko-KR")}원
                      </div>
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
