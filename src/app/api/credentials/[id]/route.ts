// 의사 교육 이수 이력 삭제 — 본인이 등록한 오프라인 이력만
// DELETE /api/credentials/:id
// (온라인 과정 이수는 강의 진도로 생긴 기록이라 지우지 않는다)

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const c = await prisma.dentistCredential.findUnique({
    where: { id: params.id },
    select: { dentistId: true, source: true },
  });
  if (!c || c.dentistId !== session.user.id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (c.source !== "OFFLINE") {
    return NextResponse.json(
      { error: "NOT_DELETABLE", message: "온라인 과정 이수 기록은 지울 수 없습니다" },
      { status: 400 },
    );
  }
  await prisma.dentistCredential.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
