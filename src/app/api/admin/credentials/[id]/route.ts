// 관리자: 오프라인 이수 이력 확인 / 반려
// PATCH /api/admin/credentials/:id  { action: "VERIFY" } | { action: "REJECT", reason }

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, validationError } from "@/lib/admin-guard";
import { credentialReviewSchema } from "@/lib/learning";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = credentialReviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error.issues);
  const review = parsed.data;

  const c = await prisma.dentistCredential.findUnique({
    where: { id: params.id },
    select: { source: true },
  });
  if (!c) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (c.source !== "OFFLINE") {
    return NextResponse.json(
      { error: "NOT_REVIEWABLE", message: "온라인 과정 이수는 자동으로 확인됩니다" },
      { status: 400 },
    );
  }

  const updated = await prisma.dentistCredential.update({
    where: { id: params.id },
    data: {
      status: review.action === "VERIFY" ? "VERIFIED" : "REJECTED",
      rejectReason: review.action === "REJECT" ? review.reason : null,
      reviewedById: guard.userId,
      reviewedAt: new Date(),
    },
  });
  return NextResponse.json(updated);
}
