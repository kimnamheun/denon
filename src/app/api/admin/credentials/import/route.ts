// 관리자: 교육 사이트 수강 이력 CSV 가져오기 (연동 API 가 생기기 전 수동 반영용)
// POST /api/admin/credentials/import  { csv: "externalId,licenseNumber,programKey,title,completedOn\n..." }

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-guard";
import { importCompletions, parseCompletionCsv } from "@/lib/education-sync";

const bodySchema = z.object({ csv: z.string().min(1).max(500_000) });

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", message: "CSV 내용을 붙여넣어 주세요" }, { status: 400 });
  }
  const { records, error } = parseCompletionCsv(parsed.data.csv);
  if (error) return NextResponse.json({ error: "CSV_ERROR", message: error }, { status: 400 });
  if (records.length > 1000) {
    return NextResponse.json({ error: "TOO_MANY", message: "한 번에 1000줄까지 가져올 수 있습니다" }, { status: 400 });
  }
  const result = await importCompletions(records);
  return NextResponse.json(result);
}
