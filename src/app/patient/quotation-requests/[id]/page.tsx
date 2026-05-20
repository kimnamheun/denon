import { notFound } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const URGENCY_LABEL: Record<string, string> = {
  LOW: "여유롭게",
  MEDIUM: "보통",
  HIGH: "시급",
};

export default async function QuotationRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) return null;

  const request = await prisma.quotationRequest.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      missingTeeth: true,
      photos: { orderBy: { displayOrder: "asc" } },
      quotations: {
        where: { deletedAt: null },
        include: {
          dentist: { include: { user: { select: { name: true } } } },
          clinic: { select: { id: true, name: true, rating: true, reviewCount: true, sido: true, sigungu: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!request) notFound();
  if (request.patientId !== session.user.id) notFound();

  const formatWon = (n: bigint | null) =>
    n === null ? "-" : `${n.toLocaleString("ko-KR")}원`;

  return (
    <main className="container max-w-4xl py-10 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/patient/quotation-requests" className="text-base text-muted-foreground hover:underline">
          ← 목록으로
        </Link>
        <div className="flex gap-2">
          {request.status === "OPEN" && (
            <Link href={`/patient/quotation-requests/${request.id}/edit`}>
              <Button variant="outline" size="sm">수정</Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>견적 요청 #{request.id.slice(0, 8)}</CardTitle>
              <CardDescription>
                작성일: {new Date(request.createdAt).toLocaleString("ko-KR")}
              </CardDescription>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              {request.status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-base">
          <Field label="치아 위치">
            {request.missingTeeth.map((t) => t.toothNumber).sort().join(", ") || "-"}
          </Field>
          <Field label="증상">{request.symptoms || "-"}</Field>
          <Field label="치료 이력">{request.previousTreatment || "-"}</Field>
          <Field label="긴급도">{URGENCY_LABEL[request.urgency]}</Field>
          <Field label="예산">
            {formatWon(request.minBudget)} ~ {formatWon(request.maxBudget)}
          </Field>
          <Field label="선호 브랜드">{request.preferredImplantBrand || "-"}</Field>
          <Field label="선호 병원 유형">{request.preferredHospitalType || "-"}</Field>
          <Field label="기타 요청사항">{request.additionalNotes || "-"}</Field>

          {request.photos.length > 0 && (
            <div>
              <div className="font-medium mb-2">첨부 사진</div>
              <div className="grid grid-cols-3 gap-2">
                {request.photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={p.photoUrl} alt="첨부" className="w-full h-32 object-cover rounded" />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <section>
        <h2 className="text-xl font-bold mb-3">
          받은 견적서 ({request.quotations.length}건)
        </h2>
        {request.quotations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              아직 견적서가 도착하지 않았습니다.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {request.quotations.map((q) => (
              <Link key={q.id} href={`/patient/quotations/${q.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{q.clinic.name}</div>
                        <div className="text-base text-muted-foreground mt-1">
                          {q.dentist.user.name} 원장 · 평점 {Number(q.clinic.rating).toFixed(1)} ({q.clinic.reviewCount})
                        </div>
                        <div className="text-base text-muted-foreground">
                          {q.clinic.sido} {q.clinic.sigungu}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {q.finalAmount.toLocaleString("ko-KR")}원
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {q.warrantyPeriod}년 보증 · {q.treatmentDuration}개월
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">{children}</div>
    </div>
  );
}
