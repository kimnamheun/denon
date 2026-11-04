// 관리자: 강의 수정 / 삭제
// PATCH  /api/admin/lessons/:id
// DELETE /api/admin/lessons/:id   — 강의와 그 진도 기록이 지워진다 (이미 생긴 과정 이수 이력은 남는다)

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, validationError } from "@/lib/admin-guard";
import { lessonInputSchema } from "@/lib/learning";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = lessonInputSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues);
  const d = parsed.data;

  const exists = await prisma.courseLesson.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const updated = await prisma.courseLesson.update({
    where: { id: params.id },
    data: {
      title: d.title,
      description: d.description === undefined ? undefined : d.description || null,
      videoUrl: d.videoUrl === undefined ? undefined : d.videoUrl || null,
      durationMin: d.durationMin,
      displayOrder: d.displayOrder,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  await prisma.courseLesson.deleteMany({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
