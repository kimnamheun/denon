// 이메일 발송 유틸 — Nodemailer (Gmail SMTP)
// 환경변수 미설정 시 무음 로깅 (개발용)
//
// 이메일은 화면 응답을 막지 않도록 fire-and-forget 으로 사용 권장:
//   void sendQuotationReceivedEmail(...)

import nodemailer, { type Transporter } from "nodemailer";

const host = process.env.EMAIL_SERVER_HOST;
const port = Number(process.env.EMAIL_SERVER_PORT ?? "587");
const user = process.env.EMAIL_SERVER_USER;
const pass = process.env.EMAIL_SERVER_PASSWORD;
const from = process.env.EMAIL_FROM ?? "noreply@dental-platform.com";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!host || !user || !pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** 이메일 발송 — 환경변수 미설정 시 콘솔 로깅만 */
export async function sendMail(opts: MailOptions): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log("[mailer:noop]", opts.subject, "→", opts.to);
    return;
  }
  try {
    await t.sendMail({ from, ...opts });
  } catch (err) {
    console.error("[mailer] 발송 실패:", err);
  }
}

// ============================================================
// 도메인 이벤트별 템플릿
// ============================================================

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** 읽지 않은 채팅 메시지 알림 (cron 으로 주기적 발송) */
export async function sendUnreadChatEmail(opts: {
  to: string;
  recipientName: string;
  senderName: string;
  unreadCount: number;
  preview: string;
  roomLink: string;
}) {
  await sendMail({
    to: opts.to,
    subject: `[임플란트 플랫폼] ${opts.senderName} 님으로부터 새 메시지 ${opts.unreadCount}건`,
    html: `
      <h2>${opts.recipientName}님, 새 메시지가 있어요</h2>
      <p><strong>${opts.senderName}</strong> 님께서 보내신 읽지 않은 메시지가 <strong>${opts.unreadCount}건</strong> 있습니다.</p>
      <blockquote style="border-left: 4px solid #ddd; padding-left: 12px; color: #555;">
        ${opts.preview}
      </blockquote>
      <p><a href="${opts.roomLink}">채팅에서 확인하기 →</a></p>
      <p style="color: #999; font-size: 12px;">본 채팅은 일반 상담 문의 용도이며, 정확한 진단·치료는 의료기관 방문 후 상담하시기 바랍니다.</p>
    `,
  });
}

export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  role: "PATIENT" | "DENTIST";
}) {
  const isDentist = opts.role === "DENTIST";
  const link = isDentist ? `${baseUrl}/dentist/dashboard` : `${baseUrl}/patient/dashboard`;
  await sendMail({
    to: opts.to,
    subject: "[임플란트 플랫폼] 가입을 환영합니다",
    html: `
      <h2>${opts.name}님, 환영합니다 🦷</h2>
      <p>치과 임플란트 중계 플랫폼에 가입하신 것을 환영합니다.</p>
      ${isDentist
        ? "<p>치과의사 인증이 완료되면 견적서 작성 및 환자 매칭이 가능합니다.</p>"
        : "<p>견적 요청을 등록하여 여러 치과의 견적을 비교해보세요.</p>"
      }
      <p><a href="${link}">대시보드 가기 →</a></p>
    `,
  });
}

export async function sendQuotationReceivedEmail(opts: {
  to: string;
  patientName: string;
  clinicName: string;
  finalAmount: bigint | number;
  quotationId: string;
}) {
  const amount = Number(opts.finalAmount).toLocaleString("ko-KR");
  await sendMail({
    to: opts.to,
    subject: `[임플란트 플랫폼] ${opts.clinicName} 견적서가 도착했습니다`,
    html: `
      <h2>${opts.patientName}님, 새 견적서가 도착했습니다</h2>
      <p><strong>${opts.clinicName}</strong>에서 견적서를 보내왔습니다.</p>
      <p style="font-size: 1.5em;">${amount}원</p>
      <p><a href="${baseUrl}/patient/quotations/${opts.quotationId}">견적서 확인 →</a></p>
    `,
  });
}

export async function sendQuotationAcceptedEmail(opts: {
  to: string;
  dentistName: string;
  patientName: string;
  quotationId: string;
}) {
  await sendMail({
    to: opts.to,
    subject: `[임플란트 플랫폼] 견적서가 수락되었습니다`,
    html: `
      <h2>${opts.dentistName} 원장님, 견적서가 수락되었습니다 🎉</h2>
      <p>${opts.patientName}님께서 견적서를 수락하셨습니다. 곧 상담 예약이 진행될 예정입니다.</p>
      <p><a href="${baseUrl}/dentist/quotations/${opts.quotationId}">견적 상세 →</a></p>
    `,
  });
}

export async function sendConsultationBookedEmail(opts: {
  to: string;
  recipientName: string;
  counterpartName: string;
  scheduledAt: Date;
  duration: number;
  consultationId: string;
  recipientRole: "PATIENT" | "DENTIST";
}) {
  const when = opts.scheduledAt.toLocaleString("ko-KR");
  const link =
    opts.recipientRole === "PATIENT"
      ? `${baseUrl}/patient/appointments/${opts.consultationId}`
      : `${baseUrl}/dentist/appointments`;
  await sendMail({
    to: opts.to,
    subject: `[임플란트 플랫폼] 상담 예약이 확정되었습니다`,
    html: `
      <h2>${opts.recipientName}님, 상담 예약이 확정되었습니다</h2>
      <p><strong>${opts.counterpartName}</strong>과의 상담이 다음 일정으로 예약되었습니다.</p>
      <p>📅 <strong>${when}</strong> (약 ${opts.duration}분)</p>
      <p><a href="${link}">예약 상세 →</a></p>
    `,
  });
}
