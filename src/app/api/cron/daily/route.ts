// 매일 cron (서울 00:05) — 만료 처리 + 월 이용권 갱신 결제
// Vercel Hobby 는 cron 개수·횟수가 제한돼 하루 작업을 한 주소로 묶는다.
// 보안: CRON_SECRET (Authorization: Bearer) 로만 허용

import { NextResponse } from "next/server";

import { isAuthorizedCron } from "@/lib/cron-auth";
import { runExpireJob } from "@/lib/jobs/expire";
import { runSubscriptionJob } from "@/lib/subscription-server";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const now = new Date();
  const expire = await runExpireJob(now);
  // 결제 작업이 실패해도 만료 처리 결과는 남긴다
  let subscription: Awaited<ReturnType<typeof runSubscriptionJob>> | { error: string };
  try {
    subscription = await runSubscriptionJob(now);
  } catch (err) {
    console.error("[cron:daily] subscription job failed:", err);
    subscription = { error: err instanceof Error ? err.message : "subscription job failed" };
  }
  console.log("[cron:daily]", { expire, subscription });
  return NextResponse.json({ ok: true, expire, subscription });
}
