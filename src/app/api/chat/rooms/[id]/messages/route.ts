// 채팅 메시지 조회 / 등록
// GET  /api/chat/rooms/:id/messages?q=keyword  — 메시지 목록 + readAt 일괄 처리 + 상대방 typing 상태
// POST /api/chat/rooms/:id/messages            — 메시지 등록 (content 와/또는 imageUrl)

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { id: string };
}

// typing ping 유효 기간 (마지막 ping 으로부터 이 시간 안이면 입력 중으로 본다)
const TYPING_ACTIVE_MS = 5000;

async function assertMember(roomId: string, userId: string) {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      patientId: true,
      dentistId: true,
      deletedAt: true,
      patientTypingAt: true,
      dentistTypingAt: true,
    },
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

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const pinnedOnly = searchParams.get("pinnedOnly") === "true";

  // 상대방이 보낸 미읽음 메시지 모두 readAt = now() 일괄 처리 (검색·핀 조회 시는 skip)
  if (!q && !pinnedOnly) {
    const otherRole = session.user.role === "PATIENT" ? "DENTIST" : "PATIENT";
    await prisma.chatMessage.updateMany({
      where: { roomId: params.id, senderRole: otherRole, readAt: null, deletedAt: null },
      data: { readAt: new Date() },
    });
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      roomId: params.id,
      ...(q ? { content: { contains: q, mode: "insensitive" }, deletedAt: null } : {}),
      ...(pinnedOnly ? { pinnedAt: { not: null }, deletedAt: null } : {}),
    },
    orderBy: pinnedOnly ? { pinnedAt: "desc" } : { createdAt: "asc" },
    take: 500,
  });

  // 상대방 typing 상태 확인
  const otherTypingAt =
    session.user.role === "PATIENT" ? room.dentistTypingAt : room.patientTypingAt;
  const otherTyping =
    !!otherTypingAt && Date.now() - new Date(otherTypingAt).getTime() < TYPING_ACTIVE_MS;

  return NextResponse.json({
    roomId: params.id,
    myRole: session.user.role,
    messages,
    otherTyping,
  });
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const room = await assertMember(params.id, session.user.id);
  if (!room) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  let body: { content?: string; imageUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const content = (body.content ?? "").trim();
  const imageUrl = (body.imageUrl ?? "").trim() || null;

  if (!content && !imageUrl) {
    return NextResponse.json({ error: "EMPTY_CONTENT" }, { status: 400 });
  }
  if (content.length > 2000) return NextResponse.json({ error: "TOO_LONG" }, { status: 400 });

  const role = session.user.role as "PATIENT" | "DENTIST";
  const preview = imageUrl && !content
    ? "[사진]"
    : content.length > 100
      ? content.slice(0, 100)
      : content;
  const now = new Date();

  // 메시지 등록 + 방 lastMessage 정보 갱신 + 본인 typing 상태 해제
  const myTypingField = role === "PATIENT" ? "patientTypingAt" : "dentistTypingAt";
  const [msg] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        roomId: params.id,
        senderId: session.user.id,
        senderRole: role,
        content,
        imageUrl,
      },
    }),
    prisma.chatRoom.update({
      where: { id: params.id },
      data: {
        lastMessageAt: now,
        lastMessagePreview: preview,
        [myTypingField]: null,
      },
    }),
  ]);

  return NextResponse.json(msg, { status: 201 });
}
