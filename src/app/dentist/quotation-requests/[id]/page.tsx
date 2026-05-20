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

export default async function DentistRequestViewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DENTIST") return null;

  const request = await prisma.quotationRequest.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      missingTeeth: true,
      photos: { orderBy: { displayOrder: "asc" } },
      patient: { include: { user: { select: { name: true } } } },
      quotations: {
        where: { dentistId: session.user.id, deletedAt: null },
        select: { id: true },
      },
    },
  });

  if (!request) notFound();

  const alreadyQuoted = request.quotations.length > 0;
  const isOpen = request.status === "OPEN";

  const formatWon = (n: bigint | null) =>
    n === null ? "-" : `${n.toLocaleString("ko-KR")}원`;

  return (
    <main className="container max-w-3xl py-10 space-y-6">
      <Link href="/dentist/quotation-requests/available" className="text-base text-muted-foreground hover:underline">
        ← 목록으로
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            치아 {request.missingTeeth.length}개 임플란트 견적 요청
          </CardTitle>
          <CardDescription>
            요청일: {new Date(request.createdAt).toLocaleString("ko-KR")} · 환자: {request.patient.user.name}
          </CardDescription>
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

      <div className="flex justify-end gap-2">
        {alreadyQuoted ? (
          <div className="flex items-center gap-2">
            <p className="text-base text-muted-foreground">이미 견적서를 작성하셨습니다</p>
            <Link href={`/dentist/quotations/${request.quotations[0].id}`}>
              <Button variant="outline">내 견적서 보기</Button>
            </Link>
          </div>
        ) : isOpen ? (
          <Link href={`/dentist/quotations/new?requestId=${request.id}`}>
            <Button>견적서 작성하기</Button>
          </Link>
        ) : (
          <p className="text-base text-muted-foreground">마감된 요청입니다</p>
        )}
      </div>
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
