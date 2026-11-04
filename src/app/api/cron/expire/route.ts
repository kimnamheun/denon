// 만료 처리 (수동 실행용) — 매일 자동 실행은 /api/cron/daily 가 같은 작업을 부른다
//
// 1) 견적 요청: OPEN 이고 expiresAt 이 지난 요청 → EXPIRED
//    (그 요청에 남아 있던 PENDING 견적서도 함께 EXPIRED)
// 2) 견적서: PENDING 이고 validUntil(서울 기준 날짜)이 지난 견적서 → EXPIRED
// 상태가 바뀐 견적서는 모두 이력(QuotationStatusHistory)을 남긴다.
//
// expiresAt 이 비어 있는 예전 요청은 건드리지 않는다 (새 요청부터 생성 시 30일로 채워진다).
//
// 보안: CRON_SECRET (Authorization: Bearer) 로만 허용

import { NextResponse } from "next/server";

import { isAuthorizedCron } from "@/lib/cron-auth";
import { runExpireJob } from "@/lib/jobs/expire";

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const result = await runExpireJob();
  console.log("[cron:expire]", result);
  return NextResponse.json({ ok: true, ...result });
}
