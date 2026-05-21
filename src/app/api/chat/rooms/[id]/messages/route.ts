// 채팅 메시지 조회 / 등록
// GET  /api/chat/rooms/:id/messages   — 메시지 목록 + 상대방 메시지 readAt 일괄 처리
// POST /api/chat/rooms/:id/messages   — 메시지 등록

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { id: string };
}

async function assertMember(roomId: string, userId: string) {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { id: true, patientId: true, dentistId: true, deletedAt: true },
  });
  if (!room || room.deletedAt) return null;
  if (room.patientId !== userId && room.dentistId !== userId) return null;
  return room;
}

export async function GET(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const room = await assertMember(params.id, session.user.id);
  if (!room) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  // 상대방이 보낸 미읽음 메시지 모두 readAt = now() 일괄 처리
  const otherRole = session.user.role === "PATIENT" ? "DENTIST" : "PATIENT";
  await prisma.chatMessage.updateMany({
    where: { roomId: params.id, senderRole: otherRole, readAt: null },
    data: { readAt: new Date() },
  });

  const messages = await prisma.chatMessage.findMany({
    where: { roomId: params.id },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  return NextResponse.json({
    roomId: params.id,
    myRole: session.user.role,
    messages,
  });
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const room = await assertMember(params.id, session.user.id);
  if (!room) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const content = (body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "EMPTY_CONTENT" }, { status: 400 });
  if (content.length > 2000) return NextResponse.json({ error: "TOO_LONG" }, { status: 400 });

  // 메시지 등록 + 방의 lastMessage 정보 갱신 (단일 트랜잭션)
  const role = session.user.role as "PATIENT" | "DENTIST";
  const preview = content.length > 100 ? content.slice(0, 100) : content;
  const now = new Date();

  const [msg] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        roomId: params.id,
        senderId: session.user.id,
        senderRole: role,
        content,
      },
    }),
    prisma.chatRoom.update({
      where: { id: params.id },
      data: { lastMessageAt: now, lastMessagePreview: preview },
    }),
  ]);

  return NextResponse.json(msg, { status: 201 });
}
