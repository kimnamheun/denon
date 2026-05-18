// 관리자: 병원 프리미엄 토글
// PATCH /api/admin/clinics/:id/premium  { isPremium: boolean }

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ isPremium: z.boolean() });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const clinic = await prisma.clinic.update({
    where: { id: params.id },
    data: { isPremium: parsed.data.isPremium },
    select: { id: true, name: true, isPremium: true },
  });
  return NextResponse.json(clinic);
}
