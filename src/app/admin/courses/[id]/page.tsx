// 관리자: 술식 과정 수정 + 강의 관리

import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseForm } from "../course-form";
import { LessonManager } from "./lesson-manager";

export default async function AdminCourseEditPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;

  const course = await prisma.course.findUnique({
    where: { id: params.id, deletedAt: null },
    include: { lessons: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] } },
  });
  if (!course) notFound();

  return (
    <main className="container max-w-4xl space-y-6 py-10">
      <Link href="/admin/courses" className="text-base text-muted-foreground hover:underline">
        ← 과정 목록
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>과정 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseForm
            courseId={course.id}
            initial={{
              title: course.title,
              summary: course.summary,
              procedureTags: course.procedureTags,
              level: course.level,
              instructor: course.instructor ?? "",
              displayOrder: course.displayOrder,
              isPublished: course.isPublished,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>강의 ({course.lessons.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          <LessonManager
            courseId={course.id}
            lessons={course.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              description: l.description ?? "",
              videoUrl: l.videoUrl ?? "",
              durationMin: l.durationMin,
              displayOrder: l.displayOrder,
            }))}
          />
        </CardContent>
      </Card>
    </main>
  );
}
