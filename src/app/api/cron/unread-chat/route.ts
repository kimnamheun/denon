// 미읽음 채팅 이메일 알림 cron
// Vercel cron 으로 하루 1번 호출 — 서울 09:00 (vercel.json 의 crons 설정 참고, Hobby 요금제는 하루 1번까지만 허용)
//
// 조건: 읽지 않은 메시지가 1건 이상 + 가장 오래된 미읽음 메시지가 5분 이상 경과
//       + 같은 방에 마지막 이메일 발송 후 1시간 이상 경과
//
// 보안: CRON_SECRET (Authorization: Bearer) 로만 허용 — src/lib/cron-auth.ts

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendUnreadChatEmail } from "@/lib/mailer";
import { isAuthorizedCron } from "@/lib/cron-auth";

const UNREAD_THRESHOLD_MS = 5 * 60 * 1000;     // 5분
const EMAIL_COOLDOWN_MS = 60 * 60 * 1000;       // 1시간

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://denon.vercel.app";

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();
  const thresholdAt = new Date(now.getTime() - UNREAD_THRESHOLD_MS);
  const cooldownAt = new Date(now.getTime() - EMAIL_COOLDOWN_MS);

  // 후보 방: 미읽음 메시지가 있고 (이메일 발송 안 했거나 쿨다운 지났음)
  const rooms = await prisma.chatRoom.findMany({
    where: {
      deletedAt: null,
      OR: [{ lastEmailNotifiedAt: null }, { lastEmailNotifiedAt: { lt: cooldownAt } }],
      messages: {
        some: {
          readAt: null,
          deletedAt: null,
          createdAt: { lt: thresholdAt },
        },
      },
    },
    include: {
      patient: { include: { user: { select: { email: true, name: true } } } },
      dentist: { include: { user: { select: { email: true, name: true } } } },
      messages: {
        where: { readAt: null, deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, senderRole: true, content: true, imageUrl: true, createdAt: true },
      },
    },
    take: 200,
  });

  let emailsSent = 0;
  const errors: string[] = [];

  for (const r of rooms) {
    // 어느 쪽에게 보낼지: 상대방이 보낸 미읽음 메시지가 있는 쪽
    const unreadFromDentist = r.messages.filter((m) => m.senderRole === "DENTIST");
    const unreadFromPatient = r.messages.filter((m) => m.senderRole === "PATIENT");

    const tasks: Promise<unknown>[] = [];

    if (unreadFromDentist.length > 0 && r.patient.user.email) {
      const preview = unreadFromDentist[unreadFromDentist.length - 1];
      tasks.push(
        sendUnreadChatEmail({
          to: r.patient.user.email,
          recipientName: r.patient.user.name,
          senderName: `${r.dentist.user.name} 의사선생님`,
          unreadCount: unreadFromDentist.length,
          preview: preview.content || (preview.imageUrl ? "[사진]" : ""),
          roomLink: `${baseUrl}/patient/chat/${r.id}`,
        })
          .then(() => {
            emailsSent++;
          })
          .catch((e: unknown) => errors.push(`room=${r.id} patient: ${(e as Error).message}`)),
      );
    }
    if (unreadFromPatient.length > 0 && r.dentist.user.email) {
      const preview = unreadFromPatient[unreadFromPatient.length - 1];
      tasks.push(
        sendUnreadChatEmail({
          to: r.dentist.user.email,
          recipientName: r.dentist.user.name,
          senderName: `환자 ${r.patient.user.name}`,
          unreadCount: unreadFromPatient.length,
          preview: preview.content || (preview.imageUrl ? "[사진]" : ""),
          roomLink: `${baseUrl}/dentist/chat/${r.id}`,
        })
          .then(() => {
            emailsSent++;
          })
          .catch((e: unknown) => errors.push(`room=${r.id} dentist: ${(e as Error).message}`)),
      );
    }

    await Promise.allSettled(tasks);

    // 방 단위로 lastEmailNotifiedAt 갱신 (양쪽 모두 발송했어도 한 번만)
    await prisma.chatRoom.update({
      where: { id: r.id },
      data: { lastEmailNotifiedAt: now },
    });
  }

  return NextResponse.json({
    checkedRooms: rooms.length,
    emailsSent,
    errors,
  });
}
