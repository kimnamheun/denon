// 의사 전용 술식 과정 상세 — 강의 영상 + 진도 (면허 인증 의사만)

import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDentistAccess } from "@/lib/dentist-access";
import { VerificationPending } from "@/components/dentist/verification-pending";
import { LEVEL_LABEL, parseLessonVideo, procedureTagLabel } from "@/lib/learning";
import { getProcedureGuide } from "@/lib/content/procedures";
import { programsForTags } from "@/lib/content/education-programs";
import { EducationProgramCards } from "@/components/education-program-cards";
import { toViewUrl } from "@/lib/s3";
import { LessonPlayer, type PlayerLesson } from "./lesson-player";

export default async function DentistCoursePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DENTIST") return null;

  const access = await getDentistAccess(session.user.id);
  if (!access.isVerified) {
    return (
      <main className="container max-w-3xl py-8">
        <VerificationPending />
      </main>
    );
  }

  const course = await prisma.course.findUnique({
    where: { id: params.id, deletedAt: null },
    include: { lessons: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] } },
  });
  if (!course || !course.isPublished) notFound();

  const [done, credential] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { dentistId: session.user.id, lessonId: { in: course.lessons.map((l) => l.id) } },
      select: { lessonId: true },
    }),
    prisma.dentistCredential.findUnique({
      where: { dentistId_courseId: { dentistId: session.user.id, courseId: course.id } },
      select: { id: true },
    }),
  ]);
  const doneSet = new Set(done.map((d) => d.lessonId));

  // 영상 주소: 우리 S3 파일이면 서명 URL 로 바꾼 뒤 재생 방식을 정한다
  const lessons: PlayerLesson[] = await Promise.all(
    course.lessons.map(async (l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      durationMin: l.durationMin,
      video: parseLessonVideo(l.videoUrl ? await toViewUrl(l.videoUrl) : null),
      done: doneSet.has(l.id),
    })),
  );

  const patientGuides = course.procedureTags
    .map(getProcedureGuide)
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  return (
    <main className="container max-w-3xl space-y-5 py-8">
      <Link href="/dentist/learning" className="text-base text-muted-foreground hover:underline">
        ← 과정 목록
      </Link>

      <div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm">{LEVEL_LABEL[course.level]}</span>
          {course.procedureTags.map((t) => (
            <span key={t} className="rounded bg-blue-50 px-2 py-0.5 text-sm text-blue-700">
              {procedureTagLabel(t)}
            </span>
          ))}
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">{course.title}</h1>
        {course.instructor && <p className="mt-1 text-base text-muted-foreground">강사 {course.instructor}</p>}
        <p className="mt-3 whitespace-pre-wrap text-base">{course.summary}</p>
      </div>

      <LessonPlayer lessons={lessons} alreadyCompleted={Boolean(credential)} />

      <EducationProgramCards
        programs={programsForTags(course.procedureTags)}
        title="이 술식을 다루는 오스템 오프라인 과정"
        description="온라인 강의를 마친 뒤 실습 과정으로 이어 들을 수 있습니다."
      />

      {patientGuides.length > 0 && (
        <div className="rounded-lg border p-4">
          <p className="mb-2 text-base font-semibold">환자에게 보여줄 쉬운 설명</p>
          <p className="mb-3 text-sm text-muted-foreground">
            상담할 때 환자에게 이 주소를 보내면 치료 과정을 미리 읽어볼 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {patientGuides.map((g) => (
              <Link
                key={g.tag}
                href={`/procedures/${g.tag}`}
                target="_blank"
                className="inline-flex h-10 items-center rounded-full border px-4 text-base hover:bg-muted"
              >
                {g.name} 환자 안내 ↗
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
