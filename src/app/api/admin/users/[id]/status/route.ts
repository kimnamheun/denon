// 관리자: 사용자 상태 변경 (ACTIVE/INACTIVE/SUSPENDED)
// PATCH /api/admin/users/:id/status  { status: "ACTIVE" | "INACTIVE" | "SUSPENDED" }

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

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

  // 본인 계정은 차단할 수 없음
  if (params.id === session.user.id && parsed.data.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "SELF_BLOCK", message: "본인 계정은 비활성화할 수 없습니다" },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
    select: { id: true, email: true, status: true },
  });

  return NextResponse.json(user);
}
