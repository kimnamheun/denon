// 관리자: 오프라인 연수 이수 확인 — 수료증을 보고 확인/반려

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { formatCredentialLine } from "@/lib/learning";
import { toViewUrl } from "@/lib/s3";
import { ReviewButtons } from "./review-buttons";

export default async function AdminCredentialsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;

  const [pending, recent] = await Promise.all([
    prisma.dentistCredential.findMany({
      where: { source: "OFFLINE", status: "PENDING" },
      include: {
        dentist: { select: { licenseNumber: true, isVerified: true, user: { select: { name: true } }, clinic: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dentistCredential.findMany({
      where: { source: "OFFLINE", status: { in: ["VERIFIED", "REJECTED"] } },
      include: { dentist: { select: { user: { select: { name: true } } } } },
      orderBy: { reviewedAt: "desc" },
      take: 20,
    }),
  ]);
  const certificateViews = await Promise.all(pending.map((c) => toViewUrl(c.certificateUrl)));

  return (
    <main className="container max-w-4xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">이수 확인</h1>
        <p className="mt-1 text-muted-foreground">
          의사가 등록한 오프라인 연수입니다. 수료증의 과정명·기관·날짜가 입력과 같은지 확인하세요. 확인하면 환자 화면에 표시됩니다.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">확인 대기 ({pending.length}건)</h2>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">확인할 이력이 없습니다.</CardContent>
          </Card>
        ) : (
          pending.map((c, i) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
                {certificateViews[i] ? (
                  <a href={certificateViews[i] ?? undefined} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={certificateViews[i] ?? undefined} alt="수료증" className="h-40 w-full rounded border object-contain sm:w-56" />
                  </a>
                ) : (
                  <div className="flex h-40 w-full items-center justify-center rounded border text-sm text-muted-foreground sm:w-56">
                    수료증 없음
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-semibold">{formatCredentialLine(c)}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.dentist.user.name} · 면허 {c.dentist.licenseNumber} · {c.dentist.clinic?.name ?? "병원 미등록"}
                    {!c.dentist.isVerified && " · 면허 미인증"}
                  </p>
                  <p className="text-xs text-muted-foreground">등록 {c.createdAt.toLocaleString("ko-KR")}</p>
                  <ReviewButtons id={c.id} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">최근 처리</h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {recent.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      {c.dentist.user.name} — {formatCredentialLine(c)}
                    </span>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 ${
                        c.status === "VERIFIED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {c.status === "VERIFIED" ? "확인" : `반려${c.rejectReason ? `: ${c.rejectReason}` : ""}`}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}
