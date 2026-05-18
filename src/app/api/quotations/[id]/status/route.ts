// 견적서 상태 변경 (환자 - 수락/거절)
// PATCH /api/quotations/:id/status   { action: "ACCEPT" | "REJECT", reason?: string }

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendQuotationAcceptedEmail } from "@/lib/mailer";

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

  await prisma.$transaction(async (tx) => {
    await tx.quotation.update({
      where: { id: q.id },
      data: { status: newStatus },
    });
    await tx.quotationStatusHistory.create({
      data: {
        quotationId: q.id,
        oldStatus: "PENDING",
        newStatus,
        changedById: session.user.id,
        changeReason: reason,
      },
    });
    // 수락 시: 같은 요청의 다른 견적서는 REJECTED 처리 + 요청 CLOSE
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
          where: { id: { in: otherQs.map((x) => x.id) } },
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
      await tx.quotationRequest.update({
        where: { id: q.quotationRequestId },
        data: { status: "IN_PROGRESS" },
      });
    }
  });

  // 수락 알림 (치과에게)
  if (action === "ACCEPT") {
    void (async () => {
      try {
        const detail = await prisma.quotation.findUnique({
          where: { id: q.id },
          include: {
            dentist: { include: { user: { select: { email: true, name: true } } } },
            request: { include: { patient: { include: { user: { select: { name: true } } } } } },
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
    })();
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
