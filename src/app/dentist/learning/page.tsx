// 의사 전용 술식 학습 — 과정 목록 (면허 인증 의사만)
// ?tag=sinus,bone_graft 처럼 술식으로 거를 수 있다 (견적서 작성 화면에서 넘어올 때)

import Link from "next/link";
import { GraduationCap, PlayCircle } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { getDentistAccess } from "@/lib/dentist-access";
import { VerificationPending } from "@/components/dentist/verification-pending";
import { LEVEL_LABEL, PROCEDURE_TAG_VALUES, courseProgress, procedureTagLabel } from "@/lib/learning";
import { coreTracks, programsForTags } from "@/lib/content/education-programs";
import { EducationProgramCards } from "@/components/education-program-cards";

export default async function DentistLearningPage({
  searchParams,
}: {
  searchParams: { tag?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DENTIST") return null;

  const access = await getDentistAccess(session.user.id);
  if (!access.isVerified) {
    return (
      <main className="container max-w-3xl py-8">
        <h1 className="mb-6 text-2xl font-bold">술식 학습</h1>
        <VerificationPending />
      </main>
    );
  }

  const selectedTags = (searchParams.tag ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => PROCEDURE_TAG_VALUES.includes(t));

  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      deletedAt: null,
      ...(selectedTags.length > 0 ? { procedureTags: { hasSome: selectedTags } } : {}),
    },
    include: { lessons: { select: { id: true, durationMin: true } } },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });

  const lessonIds = courses.flatMap((c) => c.lessons.map((l) => l.id));
  const [done, credentials] = await Promise.all([
    lessonIds.length === 0
      ? Promise.resolve([])
      : prisma.lessonProgress.findMany({
          where: { dentistId: session.user.id, lessonId: { in: lessonIds } },
          select: { lessonId: true },
        }),
    prisma.dentistCredential.findMany({
      where: { dentistId: session.user.id, courseId: { in: courses.map((c) => c.id) } },
      select: { courseId: true },
    }),
  ]);
  const doneSet = new Set(done.map((d) => d.lessonId));
  const completedCourses = new Set(credentials.map((c) => c.courseId));

  return (
    <main className="container max-w-3xl space-y-5 py-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">술식 학습</h1>
        <p className="mt-1 text-base text-muted-foreground">
          과정의 강의를 모두 마치면 교육 이수 이력에 자동으로 올라가고, 환자 견적 비교 화면에 표시됩니다.
        </p>
      </div>

      {/* 술식 필터 */}
      <div className="flex flex-wrap gap-2">
        <FilterChip href="/dentist/learning" active={selectedTags.length === 0} label="전체" />
        {PROCEDURE_TAG_VALUES.map((t) => (
          <FilterChip
            key={t}
            href={`/dentist/learning?tag=${t}`}
            active={selectedTags.length === 1 && selectedTags[0] === t}
            label={procedureTagLabel(t)}
          />
        ))}
      </div>

      {/* 오스템 교육 프로그램 — 술식을 골랐으면 그 술식 과정, 아니면 Basic·Master */}
      {selectedTags.length > 0 ? (
        <EducationProgramCards
          programs={programsForTags(selectedTags)}
          title={`${selectedTags.map(procedureTagLabel).join(", ")} 오프라인 과정`}
          description="오스템 교육 사이트에서 일정을 보고 신청할 수 있습니다. 수강 이력은 이수 이력으로 연동됩니다."
        />
      ) : (
        <EducationProgramCards
          programs={coreTracks()}
          title="오스템 임플란트 교육 — Basic · Master"
          description="오프라인 장기 과정입니다. 이 화면의 온라인 강의로 먼저 예습하고 신청하세요."
        />
      )}

      <h2 className="pt-2 text-lg font-bold">온라인 술식 강의</h2>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-base text-muted-foreground">
            {selectedTags.length > 0 ? "선택한 술식의 과정이 아직 없습니다." : "아직 열린 과정이 없습니다."}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {courses.map((c) => {
            const p = courseProgress(
              c.lessons.map((l) => l.id),
              doneSet,
            );
            const minutes = c.lessons.reduce((s, l) => s + (l.durationMin ?? 0), 0);
            const completed = completedCourses.has(c.id);
            return (
              <li key={c.id}>
                <Link href={`/dentist/learning/${c.id}`} className="block">
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-lg font-bold">{c.title}</p>
                        {completed ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-medium text-emerald-700">
                            <GraduationCap className="h-4 w-4" /> 이수
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-sm">
                            {LEVEL_LABEL[c.level]}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-base text-muted-foreground">{c.summary}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.procedureTags.map((t) => (
                          <span key={t} className="rounded bg-blue-50 px-2 py-0.5 text-sm text-blue-700">
                            {procedureTagLabel(t)}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <PlayCircle className="h-4 w-4" /> 강의 {p.total}개
                          {minutes > 0 && ` · ${minutes}분`}
                          {c.instructor && ` · ${c.instructor}`}
                        </span>
                        <span>
                          {p.done}/{p.total}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${p.percent}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center rounded-full border px-4 text-base ${
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
      }`}
    >
      {label}
    </Link>
  );
}
