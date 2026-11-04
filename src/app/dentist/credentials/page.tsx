// 의사 교육 이수 이력 — 온라인 과정 이수(자동) + 오프라인 연수 등록(관리자 확인)

import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCredentialLine } from "@/lib/learning";
import { toViewUrl } from "@/lib/s3";
import { OfflineCredentialForm, DeleteCredentialButton } from "./credential-form";

const STATUS: Record<string, { label: string; className: string }> = {
  VERIFIED: { label: "확인됨 · 환자에게 표시", className: "bg-emerald-100 text-emerald-700" },
  PENDING: { label: "확인 대기", className: "bg-amber-100 text-amber-700" },
  REJECTED: { label: "반려", className: "bg-red-100 text-red-700" },
};

export default async function DentistCredentialsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DENTIST") return null;

  const [dentist, credentials] = await Promise.all([
    prisma.dentist.findUnique({ where: { id: session.user.id }, select: { isVerified: true } }),
    prisma.dentistCredential.findMany({
      where: { dentistId: session.user.id },
      orderBy: [{ completedOn: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  const certificateViews = await Promise.all(credentials.map((c) => toViewUrl(c.certificateUrl)));

  return (
    <main className="container max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">교육 이수 이력</h1>
        <p className="mt-1 text-base text-muted-foreground">
          확인된 이력은 환자의 견적 비교 화면과 병원 소개에 &ldquo;○○ 과정 이수&rdquo;로 표시됩니다.
        </p>
        {!dentist?.isVerified && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-base text-amber-800">
            면허 인증이 끝나야 환자 화면에 표시됩니다.
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">내 이력 ({credentials.length}건)</h2>
        {credentials.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-base text-muted-foreground">
              아직 이수 이력이 없습니다.{" "}
              <Link href="/dentist/learning" className="text-blue-600 underline">
                술식 학습
              </Link>
              에서 과정을 마치거나, 아래에서 오프라인 연수를 등록하세요.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {credentials.map((c, i) => {
              const s = STATUS[c.status];
              return (
                <li key={c.id}>
                  <Card>
                    <CardContent className="flex gap-3 p-4">
                      <GraduationCap className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-base font-semibold">{formatCredentialLine(c)}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className={`rounded-full px-2 py-0.5 ${s.className}`}>{s.label}</span>
                          <span className="text-muted-foreground">
                            {c.source === "ONLINE_COURSE" ? "온라인 과정" : "오프라인 연수"}
                          </span>
                          {certificateViews[i] && (
                            <a
                              href={certificateViews[i] ?? undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                            >
                              수료증 보기
                            </a>
                          )}
                        </div>
                        {c.status === "REJECTED" && c.rejectReason && (
                          <p className="text-sm text-red-700">반려 사유: {c.rejectReason}</p>
                        )}
                      </div>
                      {c.source === "OFFLINE" && <DeleteCredentialButton id={c.id} />}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">오프라인 연수 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <OfflineCredentialForm />
        </CardContent>
      </Card>
    </main>
  );
}
