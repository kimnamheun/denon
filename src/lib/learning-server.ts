// 의사 술식 학습 — DB 처리 (서버 전용)

import { prisma } from "@/lib/prisma";
import { courseProgress, ONLINE_COURSE_ISSUER, type CourseProgress } from "@/lib/learning";
import { kstTodayAsDbDate } from "@/lib/kst";

export class LessonNotAvailable extends Error {}

export interface LessonCompleteResult {
  courseId: string;
  progress: CourseProgress;
  /** 이번 완료로 과정 이수가 새로 생겼으면 true */
  newlyCompleted: boolean;
}

/**
 * 강의 완료 처리. 공개된 과정의 강의만 가능.
 * 과정의 모든 강의를 마치면 온라인 이수 이력(VERIFIED)을 만든다 — 이미 있으면 그대로 둔다.
 */
export async function completeLesson(dentistId: string, lessonId: string): Promise<LessonCompleteResult> {
  return prisma.$transaction(async (tx) => {
    const lesson = await tx.courseLesson.findUnique({
      where: { id: lessonId },
      select: {
        courseId: true,
        course: {
          select: {
            title: true,
            isPublished: true,
            deletedAt: true,
            lessons: { select: { id: true } },
          },
        },
      },
    });
    if (!lesson || !lesson.course.isPublished || lesson.course.deletedAt) throw new LessonNotAvailable();

    await tx.lessonProgress.upsert({
      where: { dentistId_lessonId: { dentistId, lessonId } },
      create: { dentistId, lessonId },
      update: {},
    });

    const done = await tx.lessonProgress.findMany({
      where: { dentistId, lesson: { courseId: lesson.courseId } },
      select: { lessonId: true },
    });
    const progress = courseProgress(
      lesson.course.lessons.map((l) => l.id),
      done.map((d) => d.lessonId),
    );

    let newlyCompleted = false;
    if (progress.complete) {
      const existing = await tx.dentistCredential.findUnique({
        where: { dentistId_courseId: { dentistId, courseId: lesson.courseId } },
        select: { id: true },
      });
      if (!existing) {
        await tx.dentistCredential.create({
          data: {
            dentistId,
            courseId: lesson.courseId,
            title: lesson.course.title,
            issuer: ONLINE_COURSE_ISSUER,
            completedOn: kstTodayAsDbDate(),
            source: "ONLINE_COURSE",
            status: "VERIFIED",
          },
        });
        newlyCompleted = true;
      }
    }

    return { courseId: lesson.courseId, progress, newlyCompleted };
  });
}

export interface PublicCredential {
  id: string;
  title: string;
  issuer: string;
  completedOn: Date;
  source: "ONLINE_COURSE" | "OFFLINE";
}

/** 환자 화면용 — 면허 인증된 의사의, 확인된(VERIFIED) 이수 이력만, 최근 순 */
export async function getVerifiedCredentials(
  dentistIds: ReadonlyArray<string>,
): Promise<Map<string, PublicCredential[]>> {
  const map = new Map<string, PublicCredential[]>();
  if (dentistIds.length === 0) return map;
  const rows = await prisma.dentistCredential.findMany({
    where: { dentistId: { in: [...dentistIds] }, status: "VERIFIED", dentist: { isVerified: true } },
    select: { id: true, dentistId: true, title: true, issuer: true, completedOn: true, source: true },
    orderBy: [{ completedOn: "desc" }, { createdAt: "desc" }],
  });
  for (const r of rows) {
    const list = map.get(r.dentistId) ?? [];
    list.push({ id: r.id, title: r.title, issuer: r.issuer, completedOn: r.completedOn, source: r.source });
    map.set(r.dentistId, list);
  }
  return map;
}
