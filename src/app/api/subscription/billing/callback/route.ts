// 토스 카드 등록 성공 후 돌아오는 주소 (successUrl)
// GET /api/subscription/billing/callback?customerKey=...&authKey=...
// → billingKey 발급 → 첫 달 결제 → /dentist/subscription 으로 결과와 함께 돌려보낸다

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDentistAccess } from "@/lib/dentist-access";
import { TossError } from "@/lib/toss";
import { SubscriptionError, activateWithCard } from "@/lib/subscription-server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (params: Record<string, string>) => {
    const to = new URL("/dentist/subscription", url.origin);
    for (const [k, v] of Object.entries(params)) to.searchParams.set(k, v);
    return NextResponse.redirect(to);
  };

  const session = await auth();
  if (!session?.user || session.user.role !== "DENTIST") {
    return NextResponse.redirect(new URL("/auth/login?redirect=/dentist/subscription", url.origin));
  }
  const access = await getDentistAccess(session.user.id);
  if (!access.isVerified) return back({ billing: "fail", message: "면허 인증 후 등록할 수 있습니다" });

  const authKey = url.searchParams.get("authKey");
  const customerKey = url.searchParams.get("customerKey");
  if (!authKey || !customerKey) return back({ billing: "fail", message: "카드 등록 정보가 없습니다" });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, name: true } });
  try {
    await activateWithCard({
      dentistId: session.user.id,
      authKey,
      customerKey,
      customerEmail: user?.email,
      customerName: user?.name,
    });
    return back({ billing: "success" });
  } catch (err) {
    const message =
      err instanceof SubscriptionError || err instanceof TossError ? err.message : "결제 처리 중 오류가 났습니다";
    if (!(err instanceof SubscriptionError || err instanceof TossError)) console.error("[billing callback]", err);
    return back({ billing: "fail", message });
  }
}
