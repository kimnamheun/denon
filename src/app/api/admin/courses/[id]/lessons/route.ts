// 관리자: 과정에 강의 추가
// POST /api/admin/courses/:id/lessons

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, validationError } from "@/lib/admin-guard";
import { lessonInputSchema } from "@/lib/learning";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = lessonInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues);
  const d = parsed.data;

  const course = await prisma.course.findUnique({
    where: { id: params.id, deletedAt: null },
    select: { id: true },
  });
  if (!course) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const created = await prisma.courseLesson.create({
    data: {
      courseId: params.id,
      title: d.title,
      description: d.description || null,
      videoUrl: d.videoUrl || null,
      durationMin: d.durationMin ?? null,
      displayOrder: d.displayOrder,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
