// 의사: 월 이용권 해지 (다음 결제부터 멈춤, 남은 기간은 그대로 사용)
// POST /api/subscription/cancel

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { SubscriptionError, cancelAtPeriodEnd } from "@/lib/subscription-server";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "DENTIST") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  try {
    const sub = await cancelAtPeriodEnd(session.user.id);
    return NextResponse.json({ ok: true, currentPeriodEnd: sub.currentPeriodEnd });
  } catch (err) {
    if (err instanceof SubscriptionError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    throw err;
  }
}
