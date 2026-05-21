// 타이핑 ping — 입력 중일 때 클라이언트가 호출 (디바운스 권장)
// POST /api/chat/rooms/:id/typing

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { id: string };
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const room = await prisma.chatRoom.findUnique({
    where: { id: params.id },
    select: { patientId: true, dentistId: true, deletedAt: true },
  });
  if (!room || room.deletedAt) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (room.patientId !== session.user.id && room.dentistId !== session.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const field = session.user.role === "PATIENT" ? "patientTypingAt" : "dentistTypingAt";
  await prisma.chatRoom.update({
    where: { id: params.id },
    data: { [field]: new Date() },
  });

  return NextResponse.json({ ok: true });
}
