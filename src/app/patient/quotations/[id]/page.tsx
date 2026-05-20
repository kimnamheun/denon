import { notFound } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QuotationActions } from "./actions";

export default async function ReceivedQuotationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) return null;

  const q = await prisma.quotation.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      request: { select: { id: true, patientId: true } },
      dentist: { include: { user: { select: { name: true } } } },
      clinic: true,
      implantItems: { orderBy: { displayOrder: "asc" } },
      additionalItems: { orderBy: { displayOrder: "asc" } },
      consultationSchedules: { orderBy: { consultationDate: "asc" } },
    },
  });

  if (!q) notFound();
  if (q.request.patientId !== session.user.id) notFound();

  return (
    <main className="container max-w-3xl py-10 space-y-6">
      <Link
        href={`/patient/quotation-requests/${q.quotationRequestId}`}
        className="text-base text-muted-foreground hover:underline"
      >
        ← 요청으로 돌아가기
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{q.clinic.name}</CardTitle>
              <CardDescription>
                {q.dentist.user.name} 원장 · 평점 {Number(q.clinic.rating).toFixed(1)} (
                {q.clinic.reviewCount}) · {q.clinic.sido} {q.clinic.sigungu}
              </CardDescription>
            </div>
            <StatusBadge status={q.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Section title="치료 계획">
            <p className="whitespace-pre-wrap">{q.treatmentPlan}</p>
          </Section>

          <Section title="임플란트 항목">
            <table className="w-full text-base">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-left py-1">치아</th>
                  <th className="text-left py-1">브랜드</th>
                  <th className="text-right py-1">단가</th>
                  <th className="text-right py-1">수량</th>
                  <th className="text-right py-1">소계</th>
                </tr>
              </thead>
              <tbody>
                {q.implantItems.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="py-1">{it.toothNumber}</td>
                    <td>{it.brand}</td>
                    <td className="text-right">{Number(it.unitPrice).toLocaleString("ko-KR")}원</td>
                    <td className="text-right">{it.quantity}</td>
                    <td className="text-right">{Number(it.subtotal).toLocaleString("ko-KR")}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {q.additionalItems.length > 0 && (
            <Section title="추가 항목">
              <table className="w-full text-base">
                <tbody>
                  {q.additionalItems.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="py-1">{it.description}</td>
                      <td className="text-right">{Number(it.price).toLocaleString("ko-KR")}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          <Section title="조건">
            <dl className="grid grid-cols-2 gap-y-1 text-base">
              <dt className="text-muted-foreground">치료 기간</dt>
              <dd>{q.treatmentDuration}개월</dd>
              <dt className="text-muted-foreground">보증 기간</dt>
              <dd>{q.warrantyPeriod}년</dd>
              <dt className="text-muted-foreground">견적 유효기간</dt>
              <dd>{new Date(q.validUntil).toLocaleDateString("ko-KR")}</dd>
            </dl>
          </Section>

          {q.additionalNotes && (
            <Section title="추가 메모">
              <p className="whitespace-pre-wrap text-base">{q.additionalNotes}</p>
            </Section>
          )}

          <div className="border rounded-md p-4 bg-muted/40 space-y-1 text-base">
            <Row label="임플란트 합계" value={Number(q.implantTotalAmount)} />
            <Row label="추가 항목 합계" value={Number(q.additionalTotalAmount)} />
            <Row label="총액" value={Number(q.totalAmount)} />
            {q.discountRate > 0 && (
              <Row label={`할인 (${q.discountRate}%)`} value={-Number(q.discountAmount)} />
            )}
            <div className="border-t mt-2 pt-2 flex justify-between font-bold text-lg">
              <span>최종 금액</span>
              <span>{Number(q.finalAmount).toLocaleString("ko-KR")}원</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <QuotationActions
        quotationId={q.id}
        status={q.status}
        clinicId={q.clinic.id}
        dentistId={q.dentistId}
      />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: { label: "검토 중", className: "bg-blue-100 text-blue-700" },
    ACCEPTED: { label: "수락함", className: "bg-green-100 text-green-700" },
    REJECTED: { label: "거절함", className: "bg-gray-100 text-gray-700" },
    EXPIRED: { label: "만료", className: "bg-red-100 text-red-700" },
    WITHDRAWN: { label: "철회", className: "bg-amber-100 text-amber-700" },
  };
  const s = map[status] ?? map.PENDING;
  return <span className={`text-xs px-2 py-1 rounded-full ${s.className}`}>{s.label}</span>;
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value.toLocaleString("ko-KR")}원</span>
    </div>
  );
}
