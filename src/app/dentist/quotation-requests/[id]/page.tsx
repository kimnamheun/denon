import { notFound } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { maskName } from "@/lib/anonymize";
import { toViewUrls } from "@/lib/s3";
import {
  canDentistSeePatientName,
  canDentistViewRequest,
  getDentistAccess,
} from "@/lib/dentist-access";
import { DentistAccessNotice } from "@/components/dentist/access-notice";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTeethForDentist, toothSummary } from "@/lib/teeth";

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
      patient: { select: { sido: true, sigungu: true, user: { select: { name: true } } } },
      quotations: {
        where: { dentistId: session.user.id, deletedAt: null },
        select: { id: true, status: true },
      },
    },
  });

  if (!request) notFound();

  const alreadyQuoted = request.quotations.length > 0;
  const access = await getDentistAccess(session.user.id);
  if (!canDentistViewRequest({ canUseRequests: access.canUseRequests, requestStatus: request.status, hasOwnQuotation: alreadyQuoted })) {
    if (!access.canUseRequests) {
      return (
        <main className="container max-w-3xl py-10">
          <DentistAccessNotice block={access.block} />
        </main>
      );
    }
    notFound();
  }
  // 환자 실명은 내 견적서가 수락된 뒤에만, 그 전에는 가린 이름 + 시/구까지만
  const patientName = canDentistSeePatientName(request.quotations[0]?.status)
    ? request.patient.user.name
    : maskName(request.patient.user.name);
  const patientRegion = [request.patient.sido, request.patient.sigungu].filter(Boolean).join(" ");
  const photoViewUrls = await toViewUrls(request.photos.map((p) => p.photoUrl));
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
            임플란트 견적 요청 · {toothSummary(request.missingTeeth.map((t) => t.toothNumber))}
          </CardTitle>
          <CardDescription>
            요청일: {new Date(request.createdAt).toLocaleString("ko-KR")} · 환자: {patientName}
            {patientRegion && ` (${patientRegion})`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-base">
          <Field label="치아 위치">
            {formatTeethForDentist(request.missingTeeth.map((t) => t.toothNumber))}
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
                {request.photos.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={photoViewUrls[i]} alt="첨부" className="w-full h-32 object-cover rounded" />
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
