// 의사 교육 이수 이력 — 본인 것
// GET  /api/credentials   — 내 이수 이력 전체 (확인 대기·반려 포함)
// POST /api/credentials   — 오프라인 연수 이수 등록 (수료증 사진 필수) → 관리자 확인 대기

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { offlineCredentialSchema } from "@/lib/learning";
import { isOwnUpload } from "@/lib/s3";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "DENTIST") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const list = await prisma.dentistCredential.findMany({
    where: { dentistId: session.user.id },
    orderBy: [{ completedOn: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "DENTIST") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = offlineCredentialSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message, details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (!isOwnUpload(data.certificateUrl, session.user.id)) {
    return NextResponse.json(
      { error: "INVALID_CERTIFICATE", message: "직접 올린 수료증 사진만 등록할 수 있습니다" },
      { status: 400 },
    );
  }
  const completedOn = new Date(`${data.completedOn}T00:00:00.000Z`);
  if (Number.isNaN(completedOn.getTime()) || completedOn.getTime() > Date.now()) {
    return NextResponse.json(
      { error: "INVALID_DATE", message: "이수일은 오늘 이전 날짜로 넣어주세요" },
      { status: 400 },
    );
  }

  const created = await prisma.dentistCredential.create({
    data: {
      dentistId: session.user.id,
      title: data.title,
      issuer: data.issuer,
      completedOn,
      source: "OFFLINE",
      status: "PENDING",
      certificateUrl: data.certificateUrl,
      programKey: data.programKey || null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
