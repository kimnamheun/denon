// 관리자: 술식 과정 목록 + 새 과정

import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVEL_LABEL, procedureTagLabel } from "@/lib/learning";
import { CourseForm } from "./course-form";

export default async function AdminCoursesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;

  const courses = await prisma.course.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { lessons: true, credentials: true } } },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="container max-w-4xl space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">술식 과정</h1>
        <p className="mt-1 text-muted-foreground">면허 인증 의사에게만 보이는 강의입니다. 강의를 모두 마치면 이수 이력이 생깁니다.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {courses.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">등록된 과정이 없습니다.</p>
          ) : (
            <table className="w-full text-base">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">과정명</th>
                  <th className="p-3 text-left">술식</th>
                  <th className="p-3 text-left">난이도</th>
                  <th className="p-3 text-right">강의</th>
                  <th className="p-3 text-right">이수</th>
                  <th className="p-3 text-left">공개</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3">
                      <Link href={`/admin/courses/${c.id}`} className="font-medium text-blue-600 hover:underline">
                        {c.title}
                      </Link>
                    </td>
                    <td className="p-3 text-sm">{c.procedureTags.map(procedureTagLabel).join(", ")}</td>
                    <td className="p-3 text-sm">{LEVEL_LABEL[c.level]}</td>
                    <td className="p-3 text-right">{c._count.lessons}</td>
                    <td className="p-3 text-right">{c._count.credentials}</td>
                    <td className="p-3 text-sm">
                      {c.isPublished ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">공개</span>
                      ) : (
                        <span className="rounded bg-muted px-2 py-0.5">비공개</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>새 과정</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseForm />
        </CardContent>
      </Card>
    </main>
  );
}
