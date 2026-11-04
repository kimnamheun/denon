// 견적서 상태 변경 (환자 - 수락/거절)
// PATCH /api/quotations/:id/status   { action: "ACCEPT" | "REJECT", reason?: string }

import { NextResponse } from "next/server";
import { z } from "zod";
import { waitUntil } from "@vercel/functions";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendQuotationAcceptedEmail } from "@/lib/mailer";
import { isDbDateBeforeToday } from "@/lib/kst";

/** 트랜잭션 안에서 상태가 이미 바뀐 것을 발견했을 때 */
class StateConflict extends Error {}

const bodySchema = z.object({
  action: z.enum(["ACCEPT", "REJECT"]),
  reason: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const q = await prisma.quotation.findUnique({
    where: { id: params.id, deletedAt: null },
    select: {
      id: true,
      status: true,
      validUntil: true,
      quotationRequestId: true,
      request: { select: { patientId: true } },
    },
  });
  if (!q) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (q.request.patientId !== session.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (q.status !== "PENDING") {
    return NextResponse.json(
      { error: "INVALID_STATE", message: "PENDING 상태에서만 변경 가능" },
      { status: 400 },
    );
  }

  const { action, reason } = parsed.data;
  const newStatus = action === "ACCEPT" ? "ACCEPTED" : "REJECTED";

  // 유효기간(서울 기준 날짜)이 지난 견적서는 수락할 수 없다
  if (action === "ACCEPT" && isDbDateBeforeToday(q.validUntil)) {
    return NextResponse.json(
      { error: "EXPIRED", message: "유효기간이 지난 견적서입니다" },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 상태 조건을 걸고 바꿔서, 동시에 두 견적서를 수락하는 경우를 막는다
      const changed = await tx.quotation.updateMany({
        where: { id: q.id, status: "PENDING", deletedAt: null },
        data: { status: newStatus },
      });
      if (changed.count !== 1) throw new StateConflict();

      if (action === "ACCEPT") {
        const reqChanged = await tx.quotationRequest.updateMany({
          where: { id: q.quotationRequestId, status: "OPEN", deletedAt: null },
          data: { status: "IN_PROGRESS" },
        });
        if (reqChanged.count !== 1) throw new StateConflict();
      }

      await tx.quotationStatusHistory.create({
        data: {
          quotationId: q.id,
          oldStatus: "PENDING",
          newStatus,
          changedById: session.user.id,
          changeReason: reason,
        },
      });
      // 수락 시: 같은 요청의 다른 견적서는 REJECTED 처리
      if (action === "ACCEPT") {
        const otherQs = await tx.quotation.findMany({
          where: {
            quotationRequestId: q.quotationRequestId,
            id: { not: q.id },
            status: "PENDING",
            deletedAt: null,
          },
          select: { id: true },
        });
        if (otherQs.length > 0) {
          await tx.quotation.updateMany({
            where: { id: { in: otherQs.map((x) => x.id) }, status: "PENDING" },
            data: { status: "REJECTED" },
          });
          await tx.quotationStatusHistory.createMany({
            data: otherQs.map((x) => ({
              quotationId: x.id,
              oldStatus: "PENDING" as const,
              newStatus: "REJECTED" as const,
              changedById: session.user.id,
              changeReason: "다른 견적서가 선택됨",
            })),
          });
        }
      }
    });
  } catch (err) {
    if (err instanceof StateConflict) {
      return NextResponse.json(
        { error: "INVALID_STATE", message: "이미 처리된 견적서이거나 마감된 요청입니다" },
        { status: 409 },
      );
    }
    throw err;
  }

  // 수락 알림 (치과에게)
  if (action === "ACCEPT") {
    waitUntil((async () => {
      try {
        const detail = await prisma.quotation.findUnique({
          where: { id: q.id },
          include: {
            dentist: { include: { user: { select: { email: true, name: true } } } },
            request: { include: { patient: { select: { user: { select: { name: true } } } } } },
          },
        });
        if (detail?.dentist.user.email) {
          await sendQuotationAcceptedEmail({
            to: detail.dentist.user.email,
            dentistName: detail.dentist.user.name,
            patientName: detail.request.patient.user.name,
            quotationId: detail.id,
          });
        }
      } catch (e) {
        console.error("[notify] 견적 수락 메일 실패:", e);
      }
    })());
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
