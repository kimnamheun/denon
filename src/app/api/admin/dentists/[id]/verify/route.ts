// 관리자: 치과의사 면허 인증 토글
// PATCH /api/admin/dentists/:id/verify  { isVerified: boolean }

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ isVerified: z.boolean() });

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

  const dentist = await prisma.dentist.update({
    where: { id: params.id },
    data: { isVerified: parsed.data.isVerified },
    select: { id: true, isVerified: true, licenseNumber: true },
  });
  return NextResponse.json(dentist);
}
