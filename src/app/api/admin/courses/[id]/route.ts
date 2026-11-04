// 관리자: 술식 과정 수정 / 삭제(숨김)
// PATCH  /api/admin/courses/:id
// DELETE /api/admin/courses/:id   — soft delete. 이미 생긴 이수 이력은 그대로 남는다

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, validationError } from "@/lib/admin-guard";
import { courseInputSchema } from "@/lib/learning";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = courseInputSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues);
  const d = parsed.data;

  const exists = await prisma.course.findUnique({
    where: { id: params.id, deletedAt: null },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const updated = await prisma.course.update({
    where: { id: params.id },
    data: {
      title: d.title,
      summary: d.summary,
      procedureTags: d.procedureTags,
      level: d.level,
      instructor: d.instructor === undefined ? undefined : d.instructor || null,
      isPublished: d.isPublished,
      displayOrder: d.displayOrder,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  await prisma.course.updateMany({
    where: { id: params.id, deletedAt: null },
    data: { deletedAt: new Date(), isPublished: false },
  });
  return NextResponse.json({ ok: true });
}
