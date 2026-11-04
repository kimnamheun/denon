// 교육 사이트 → 이수 이력 연동 (서버 간 호출)
// POST /api/integrations/education/completions
//   Authorization: Bearer <EDUCATION_SYNC_API_KEY>
//   { "records": [ { "externalId", "licenseNumber", "programKey"?, "title"?, "completedOn": "YYYY-MM-DD" } ] }
// 응답: { created, updated, skipped: [{ index, externalId, reason }] }
// 같은 externalId 를 다시 보내면 덮어쓴다 (몇 번 보내도 결과가 같다).

import { NextResponse } from "next/server";

import { bearerMatches } from "@/lib/cron-auth";
import { completionBatchSchema, importCompletions } from "@/lib/education-sync";

export async function POST(req: Request) {
  if (!bearerMatches(req, process.env.EDUCATION_SYNC_API_KEY)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const parsed = completionBatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "records 배열(1~1000건)이 필요합니다" },
      { status: 400 },
    );
  }
  const result = await importCompletions(parsed.data.records);
  return NextResponse.json(result);
}
