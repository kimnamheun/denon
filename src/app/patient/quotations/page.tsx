import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: "검토 중", className: "bg-blue-100 text-blue-700" },
  ACCEPTED: { label: "수락함", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "거절함", className: "bg-gray-100 text-gray-700" },
  EXPIRED: { label: "만료", className: "bg-red-100 text-red-700" },
  WITHDRAWN: { label: "철회", className: "bg-amber-100 text-amber-700" },
};

export default async function MyReceivedQuotationsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const quotations = await prisma.quotation.findMany({
    where: { request: { patientId: session.user.id }, deletedAt: null },
    include: {
      request: { select: { id: true, symptoms: true } },
      dentist: { include: { user: { select: { name: true } } } },
      clinic: { select: { id: true, name: true, rating: true, reviewCount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="container max-w-4xl py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">받은 견적서</h1>
        <p className="text-muted-foreground mt-2">
          모든 견적 요청에 대해 받은 견적서 목록입니다
        </p>
      </div>

      {quotations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            받은 견적서가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotations.map((q) => {
            const status = STATUS_LABEL[q.status];
            return (
              <Link key={q.id} href={`/patient/quotations/${q.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{q.clinic.name}</CardTitle>
                        <CardDescription>
                          {q.dentist.user.name} 원장 · 평점 {Number(q.clinic.rating).toFixed(1)} (
                          {q.clinic.reviewCount}) ·{" "}
                          {new Date(q.createdAt).toLocaleDateString("ko-KR")}
                        </CardDescription>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${status.className}`}>
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
