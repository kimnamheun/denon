// 의사: 해지 취소 (기간이 남아 있고 등록 카드가 있을 때)
// POST /api/subscription/resume

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { SubscriptionError, resumeSubscription } from "@/lib/subscription-server";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "DENTIST") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  try {
    await resumeSubscription(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SubscriptionError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    throw err;
  }
}
