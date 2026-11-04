// 관리자: 결제 없이 월 이용권 기간 부여 (도입 초기 무료 제공·보상 등)
// POST /api/admin/subscriptions/grant  { dentistId, months }

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin, validationError } from "@/lib/admin-guard";
import { grantMonths } from "@/lib/subscription-server";

const bodySchema = z.object({
  dentistId: z.string().min(1),
  months: z.number().int().min(1).max(12),
});

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues);

  const dentist = await prisma.dentist.findUnique({ where: { id: parsed.data.dentistId }, select: { id: true } });
  if (!dentist) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const sub = await grantMonths(dentist.id, parsed.data.months);
  return NextResponse.json({ ok: true, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd });
}
