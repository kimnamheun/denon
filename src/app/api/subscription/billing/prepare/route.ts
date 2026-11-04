// 의사: 카드 자동결제 등록 준비 — 결제창에 넘길 값
// POST /api/subscription/billing/prepare
// 응답: { clientKey, customerKey, customerEmail, customerName, successUrl, failUrl }

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDentistAccess, notVerifiedResponse } from "@/lib/dentist-access";
import { canSealSecrets } from "@/lib/crypto-box";
import { tossClientKey, tossConfigured } from "@/lib/toss";
import { getOrCreateSubscription } from "@/lib/subscription-server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "DENTIST") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const access = await getDentistAccess(session.user.id);
  if (!access.isVerified) return notVerifiedResponse();

  if (!tossConfigured() || !canSealSecrets()) {
    return NextResponse.json(
      { error: "BILLING_NOT_READY", message: "카드 결제 준비 중입니다. 관리자에게 문의해 주세요" },
      { status: 503 },
    );
  }

  const [sub, user] = await Promise.all([
    getOrCreateSubscription(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, name: true } }),
  ]);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  return NextResponse.json({
    clientKey: tossClientKey(),
    customerKey: sub.customerKey,
    customerEmail: user?.email,
    customerName: user?.name,
    successUrl: `${origin}/api/subscription/billing/callback`,
    failUrl: `${origin}/dentist/subscription?billing=fail`,
  });
}
