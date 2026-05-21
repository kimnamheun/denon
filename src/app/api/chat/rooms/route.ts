// 채팅방 목록 / 생성·찾기
// GET  /api/chat/rooms                — 내 채팅방 목록 (최근 메시지 순)
// POST /api/chat/rooms                — quotationId (또는 quotationRequestId) 기준 방 생성 또는 기존 방 반환

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const userId = session.user.id;
  const role = session.user.role;

  const where =
    role === "PATIENT"
      ? { patientId: userId, deletedAt: null }
      : role === "DENTIST"
        ? { dentistId: userId, deletedAt: null }
        : null;

  if (!where) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const rooms = await prisma.chatRoom.findMany({
    where,
    include: {
      patient: { include: { user: { select: { name: true } } } },
      dentist: {
        include: {
          user: { select: { name: true } },
          clinic: { select: { id: true, name: true } },
        },
      },
      _count: {
        select: {
          messages: {
            where: {
              readAt: null,
              senderRole: role === "PATIENT" ? "DENTIST" : "PATIENT",
            },
          },
        },
      },
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return NextResponse.json(rooms);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { quotationId?: string; quotationRequestId?: string; dentistId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { quotationId, quotationRequestId, dentistId: bodyDentistId } = body;

  // 컨텍스트 유추: quotationId 가 가장 우선
  let patientId: string;
  let dentistId: string;
  const resolvedQuotationId: string | null = quotationId ?? null;
  const resolvedRequestId: string | null = quotationRequestId ?? null;

  if (quotationId) {
    const q = await prisma.quotation.findUnique({
      where: { id: quotationId },
      select: { dentistId: true, request: { select: { patientId: true } } },
    });
    if (!q) return NextResponse.json({ error: "QUOTATION_NOT_FOUND" }, { status: 404 });
    patientId = q.request.patientId;
    dentistId = q.dentistId;
  } else if (quotationRequestId && bodyDentistId) {
    // 견적서가 아직 없는 단계에서 의사 측이 먼저 문의 — quotationRequestId + dentistId
    const r = await prisma.quotationRequest.findUnique({
      where: { id: quotationRequestId },
      select: { patientId: true },
    });
    if (!r) return NextResponse.json({ error: "REQUEST_NOT_FOUND" }, { status: 404 });
    patientId = r.patientId;
    dentistId = bodyDentistId;
  } else {
    return NextResponse.json(
      { error: "MISSING_CONTEXT", message: "quotationId 또는 (quotationRequestId + dentistId) 가 필요합니다" },
      { status: 400 },
    );
  }

  // 권한: 환자 본인 또는 해당 의사만 방 생성 가능
  if (session.user.role === "PATIENT" && session.user.id !== patientId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (session.user.role === "DENTIST" && session.user.id !== dentistId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // 기존 방 찾기 (quotationId 기준 unique)
  const existing = resolvedQuotationId
    ? await prisma.chatRoom.findFirst({
        where: { quotationId: resolvedQuotationId, patientId, dentistId, deletedAt: null },
      })
    : await prisma.chatRoom.findFirst({
        where: { quotationRequestId: resolvedRequestId, patientId, dentistId, deletedAt: null },
      });

  if (existing) {
    return NextResponse.json(existing);
  }

  const created = await prisma.chatRoom.create({
    data: {
      quotationId: resolvedQuotationId,
      quotationRequestId: resolvedRequestId,
      patientId,
      dentistId,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
