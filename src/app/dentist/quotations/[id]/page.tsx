import { notFound } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: "검토 중", className: "bg-blue-100 text-blue-700" },
  ACCEPTED: { label: "선택됨", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "거절됨", className: "bg-red-100 text-red-700" },
  EXPIRED: { label: "만료", className: "bg-gray-100 text-gray-500" },
  WITHDRAWN: { label: "철회", className: "bg-amber-100 text-amber-700" },
};

export default async function DentistQuotationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DENTIST") return null;

  const q = await prisma.quotation.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      request: {
        include: {
          missingTeeth: true,
          patient: { include: { user: { select: { name: true } } } },
        },
      },
      implantItems: { orderBy: { displayOrder: "asc" } },
      additionalItems: { orderBy: { displayOrder: "asc" } },
      statusHistories: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!q) notFound();
  if (q.dentistId !== session.user.id) notFound();

  const status = STATUS_LABEL[q.status];

  return (
    <main className="container max-w-3xl py-10 space-y-6">
      <Link href="/dentist/quotations/submitted" className="text-base text-muted-foreground hover:underline">
        ← 목록으로
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>견적서 #{q.id.slice(0, 8)}</CardTitle>
              <CardDescription>
                환자: {q.request.patient.user.name} · 작성일:{" "}
                {new Date(q.createdAt).toLocaleDateString("ko-KR")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>
                {status.label}
              </span>
              {(q.status === "PENDING" || q.status === "DRAFT") && (
                <Link href={`/dentist/quotations/${q.id}/edit`}>
                  <Button variant="outline" size="sm">수정</Button>
                </Link>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-base">
          <Section title="환자 요청 치아">
            {q.request.missingTeeth.map((t) => t.toothNumber).sort().join(", ")}
          </Section>

          <Section title="치료 계획">
            <p className="whitespace-pre-wrap">{q.treatmentPlan}</p>
          </Section>

          <Section title="임플란트 항목">
            <table className="w-full text-base">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-left py-1">치아</th>
                  <th className="text-left">브랜드</th>
                  <th className="text-right">단가</th>
                  <th className="text-right">수량</th>
                  <th className="text-right">소계</th>
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
              <table className="w-full">
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

          <div className="border rounded-md p-4 bg-muted/40">
            <div className="flex justify-between font-bold text-lg">
              <span>최종 금액</span>
              <span>{Number(q.finalAmount).toLocaleString("ko-KR")}원</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              치료 {q.treatmentDuration}개월 · 보증 {q.warrantyPeriod}년 · 할인{" "}
              {q.discountRate}%
            </div>
          </div>

          {q.statusHistories.length > 0 && (
            <Section title="상태 이력">
              <ul className="space-y-1 text-xs text-muted-foreground">
                {q.statusHistories.map((h) => (
                  <li key={h.id}>
                    {new Date(h.createdAt).toLocaleString("ko-KR")} ·{" "}
                    {h.oldStatus} → {h.newStatus}
                    {h.changeReason ? ` · ${h.changeReason}` : ""}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </CardContent>
      </Card>
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
