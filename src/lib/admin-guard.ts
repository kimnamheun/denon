// 관리자 API 공통 — 로그인 + ADMIN 역할 확인

import { NextResponse } from "next/server";

import { auth } from "@/auth";

export async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false, response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }
  return { ok: true, userId: session.user.id };
}

export function validationError(issues: { message: string }[]) {
  return NextResponse.json(
    { error: "VALIDATION_ERROR", message: issues[0]?.message ?? "입력값을 확인해주세요" },
    { status: 400 },
  );
}
