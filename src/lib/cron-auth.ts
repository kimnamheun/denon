// Vercel Cron 호출 인증
//
// Vercel 은 환경변수 CRON_SECRET 이 있으면 cron 요청에 `Authorization: Bearer <CRON_SECRET>` 를 붙여 보낸다.
// User-Agent 는 누구나 흉내 낼 수 있으므로 인증 근거로 쓰지 않는다.
// CRON_SECRET 이 없으면 모든 호출을 거절한다 (배포 환경변수에 꼭 넣을 것).

import { timingSafeEqual } from "node:crypto";

export function isAuthorizedCron(req: Request, secret = process.env.CRON_SECRET): boolean {
  if (!secret) return false;
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
