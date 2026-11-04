// 관리자: 술식 과정 등록
// POST /api/admin/courses

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, validationError } from "@/lib/admin-guard";
import { courseInputSchema } from "@/lib/learning";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = courseInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues);
  const d = parsed.data;

  const created = await prisma.course.create({
    data: {
      title: d.title,
      summary: d.summary,
      procedureTags: d.procedureTags,
      level: d.level,
      instructor: d.instructor || null,
      isPublished: d.isPublished,
      displayOrder: d.displayOrder,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
