// 교육 사이트(education.denall.com) 수강 이력 → 이 앱의 교육 이수 이력 (서버 전용)
//
// 들어오는 길은 두 가지, 처리는 같다:
//   1) 교육 시스템이 호출하는 API  POST /api/integrations/education/completions  (Bearer EDUCATION_SYNC_API_KEY)
//   2) 관리자가 엑셀에서 붙여넣는 CSV  /admin/credentials
//
// 의사는 면허번호(licenseNumber)로 찾는다. 같은 수강 ID(externalId)는 한 번만 들어간다.
// 연동으로 들어온 이력은 교육 시스템 기록이라 바로 확인됨(VERIFIED) — 환자 화면에 표시된다.

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { EDUCATION_ISSUER, getEducationProgram } from "@/lib/content/education-programs";

export const completionRecordSchema = z.object({
  externalId: z.string().trim().min(1, "수강 ID 가 필요합니다").max(100),
  licenseNumber: z.string().trim().min(1, "면허번호가 필요합니다").max(50),
  /** 알려진 프로그램 키면 과정명은 비워도 된다 */
  programKey: z.string().trim().max(50).optional().or(z.literal("")),
  title: z.string().trim().max(200).optional().or(z.literal("")),
  completedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "이수일은 YYYY-MM-DD"),
});
export type CompletionRecord = z.infer<typeof completionRecordSchema>;

export const completionBatchSchema = z.object({
  records: z.array(completionRecordSchema).min(1).max(1000),
});

export const CSV_HEADER = ["externalId", "licenseNumber", "programKey", "title", "completedOn"] as const;

/**
 * CSV(첫 줄 머리글) → 레코드. 쉼표 또는 탭 구분, 따옴표로 감싼 칸 지원.
 * 머리글 이름이 CSV_HEADER 와 같아야 한다 (순서는 상관없음).
 */
export function parseCompletionCsv(text: string): { records: Record<string, string>[]; error?: string } {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return { records: [], error: "머리글과 한 줄 이상의 데이터가 필요합니다" };
  const sep = lines[0].includes("\t") ? "\t" : ",";
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === sep) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };
  const header = split(lines[0]);
  const missing = CSV_HEADER.filter((h) => h !== "programKey" && h !== "title" && !header.includes(h));
  if (missing.length) return { records: [], error: `머리글에 ${missing.join(", ")} 가 없습니다` };
  const records = lines.slice(1).map((l) => {
    const cells = split(l);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
  });
  return { records };
}

export interface ImportResult {
  created: number;
  updated: number;
  /** 면허번호로 의사를 못 찾았거나 형식이 틀린 줄 */
  skipped: { index: number; externalId?: string; reason: string }[];
}

export async function importCompletions(input: ReadonlyArray<unknown>): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: [] };

  const parsed = input.map((r, index) => ({ index, r: completionRecordSchema.safeParse(r) }));
  const valid = parsed.filter((p) => p.r.success) as { index: number; r: { success: true; data: CompletionRecord } }[];
  for (const p of parsed) {
    if (!p.r.success) {
      const raw = input[p.index] as { externalId?: string } | undefined;
      result.skipped.push({ index: p.index, externalId: raw?.externalId, reason: p.r.error.issues[0]?.message ?? "형식 오류" });
    }
  }

  const licenses = Array.from(new Set(valid.map((v) => v.r.data.licenseNumber)));
  const dentists = await prisma.dentist.findMany({
    where: { licenseNumber: { in: licenses } },
    select: { id: true, licenseNumber: true },
  });
  const byLicense = new Map(dentists.map((d) => [d.licenseNumber, d.id]));

  for (const { index, r } of valid) {
    const rec = r.data;
    const dentistId = byLicense.get(rec.licenseNumber);
    if (!dentistId) {
      result.skipped.push({ index, externalId: rec.externalId, reason: "면허번호와 일치하는 의사가 없습니다" });
      continue;
    }
    const program = getEducationProgram(rec.programKey || null);
    const title = rec.title || program?.name;
    if (!title) {
      result.skipped.push({ index, externalId: rec.externalId, reason: "과정명(title) 또는 알려진 programKey 가 필요합니다" });
      continue;
    }
    const completedOn = new Date(`${rec.completedOn}T00:00:00.000Z`);
    const existing = await prisma.dentistCredential.findUnique({
      where: { externalId: rec.externalId },
      select: { id: true },
    });
    const data = {
      dentistId,
      title,
      issuer: EDUCATION_ISSUER,
      completedOn,
      programKey: program?.key ?? (rec.programKey || null),
      source: "EDUCATION_SYNC" as const,
      status: "VERIFIED" as const,
    };
    if (existing) {
      await prisma.dentistCredential.update({ where: { id: existing.id }, data });
      result.updated++;
    } else {
      await prisma.dentistCredential.create({ data: { ...data, externalId: rec.externalId } });
      result.created++;
    }
  }
  result.skipped.sort((a, b) => a.index - b.index);
  return result;
}
