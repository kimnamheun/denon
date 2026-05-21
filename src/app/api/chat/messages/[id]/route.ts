// 개별 메시지 핀 토글 / 소프트 삭제
// PATCH  /api/chat/messages/:id   { action: "pin" | "unpin" }
// DELETE /api/chat/messages/:id   (본인이 보낸 메시지만)

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { id: string };
}

async function loadMessage(messageId: string, userId: string) {
  const msg = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: {
      room: {
        select: { id: true, patientId: true, dentistId: true, deletedAt: true },
      },
    },
  });
  if (!msg) return null;
  if (msg.room.deletedAt) return null;
  if (msg.room.patientId !== userId && msg.room.dentistId !== userId) return null;
  return msg;
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const msg = await loadMessage(params.id, session.user.id);
  if (!msg) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (body.action === "pin") {
    const updated = await prisma.chatMessage.update({
      where: { id: params.id },
      data: { pinnedAt: new Date() },
    });
    return NextResponse.json(updated);
  }
  if (body.action === "unpin") {
    const updated = await prisma.chatMessage.update({
      where: { id: params.id },
      data: { pinnedAt: null },
    });
    return NextResponse.json(updated);
  }
  return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const msg = await loadMessage(params.id, session.user.id);
  if (!msg) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  // 본인이 보낸 메시지만 삭제 가능
  if (msg.senderId !== session.user.id) {
    return NextResponse.json({ error: "FORBIDDEN", message: "본인이 보낸 메시지만 삭제할 수 있습니다" }, { status: 403 });
  }

  const updated = await prisma.chatMessage.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json(updated);
}
