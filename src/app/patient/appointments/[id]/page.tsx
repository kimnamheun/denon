import { notFound } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CancelButton } from "./cancel-button";

export default async function PatientAppointmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) return null;

  const c = await prisma.consultation.findUnique({
    where: { id: params.id },
    include: {
      dentist: { include: { user: { select: { name: true } } } },
      clinic: true,
      quotation: { select: { id: true, finalAmount: true } },
    },
  });
  if (!c) notFound();
  if (c.patientId !== session.user.id) notFound();

  const isPast = new Date(c.scheduledAt) < new Date();
  const canCancel = c.status === "SCHEDULED" && !isPast;
  const canReview =
    c.status === "COMPLETED";

  return (
    <main className="container max-w-2xl py-10 space-y-6">
      <Link href="/patient/appointments" className="text-sm text-muted-foreground hover:underline">
        ← 예약 목록
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>상담 예약 상세</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="병원">{c.clinic.name}</Row>
          <Row label="의사">{c.dentist.user.name} 원장</Row>
          <Row label="일시">{new Date(c.scheduledAt).toLocaleString("ko-KR")}</Row>
          <Row label="소요시간">{c.duration}분</Row>
          <Row label="상태">{c.status}</Row>
          {c.quotation && (
            <Row label="견적">
              <Link href={`/patient/quotations/${c.quotation.id}`} className="text-primary hover:underline">
                {c.quotation.finalAmount.toLocaleString("ko-KR")}원 견적 보기 →
              </Link>
            </Row>
          )}
          {c.notes && <Row label="메모">{c.notes}</Row>}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {canCancel && <CancelButton consultationId={c.id} />}
        {canReview && (
          <Link href={`/patient/reviews/new?consultationId=${c.id}`}>
            <span className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              리뷰 작성
            </span>
          </Link>
        )}
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
