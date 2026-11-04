// 의사 권한 확인
//
// - 면허 인증(isVerified) 전에는 환자 견적 요청을 볼 수 없다 (건강정보).
// - 월 이용권 필수(SUBSCRIPTION_ENFORCED=true)가 켜지면, 견적 요청 열람·견적서 제출·문의 시작에 이용권도 필요하다.
//   술식 학습은 이용권 없이 면허 인증만으로 쓴다.

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isSubscriptionActive, subscriptionEnforced } from "@/lib/subscription";

export type AccessBlock = "NOT_VERIFIED" | "NO_SUBSCRIPTION" | null;

export interface DentistAccess {
  exists: boolean;
  isVerified: boolean;
  clinicId: string | null;
  subscriptionActive: boolean;
  /** 견적 요청을 보고 견적서를 낼 수 있는가 (면허 인증 + 필요하면 이용권) */
  canUseRequests: boolean;
  /** canUseRequests 가 false 인 이유 */
  block: AccessBlock;
}

export function decideRequestAccess(opts: {
  isVerified: boolean;
  subscriptionActive: boolean;
  enforced: boolean;
}): { canUseRequests: boolean; block: AccessBlock } {
  if (!opts.isVerified) return { canUseRequests: false, block: "NOT_VERIFIED" };
  if (opts.enforced && !opts.subscriptionActive) return { canUseRequests: false, block: "NO_SUBSCRIPTION" };
  return { canUseRequests: true, block: null };
}

export async function getDentistAccess(dentistId: string, now: Date = new Date()): Promise<DentistAccess> {
  const d = await prisma.dentist.findUnique({
    where: { id: dentistId },
    select: {
      isVerified: true,
      clinicId: true,
      subscription: { select: { status: true, currentPeriodEnd: true } },
    },
  });
  const isVerified = d?.isVerified ?? false;
  const subscriptionActive = isSubscriptionActive(d?.subscription ?? null, now);
  return {
    exists: Boolean(d),
    isVerified,
    clinicId: d?.clinicId ?? null,
    subscriptionActive,
    ...decideRequestAccess({ isVerified, subscriptionActive, enforced: subscriptionEnforced() }),
  };
}

export const NOT_VERIFIED_MESSAGE =
  "면허 인증이 끝난 뒤 이용할 수 있습니다. 관리자 승인을 기다려 주세요.";
export const NO_SUBSCRIPTION_MESSAGE =
  "월 이용권이 있어야 견적 요청을 보고 견적서를 보낼 수 있습니다. 이용권 화면에서 등록해 주세요.";

export function notVerifiedResponse() {
  return NextResponse.json(
    { error: "DENTIST_NOT_VERIFIED", message: NOT_VERIFIED_MESSAGE },
    { status: 403 },
  );
}

/** canUseRequests 가 false 일 때 돌려줄 응답 */
export function requestAccessDenied(access: Pick<DentistAccess, "block">) {
  if (access.block === "NO_SUBSCRIPTION") {
    return NextResponse.json(
      { error: "SUBSCRIPTION_REQUIRED", message: NO_SUBSCRIPTION_MESSAGE },
      { status: 402 },
    );
  }
  return notVerifiedResponse();
}

/**
 * 의사가 이 견적 요청을 볼 수 있는지.
 * - 이미 견적서를 낸 요청이면 상태·이용권과 관계없이 볼 수 있다 (자기 견적의 맥락).
 * - 아니면 견적 요청을 쓸 수 있는 의사(면허 인증 + 필요하면 이용권) + 아직 열려 있는(OPEN) 요청만.
 */
export function canDentistViewRequest(opts: {
  canUseRequests: boolean;
  requestStatus: string;
  hasOwnQuotation: boolean;
}): boolean {
  if (opts.hasOwnQuotation) return true;
  return opts.canUseRequests && opts.requestStatus === "OPEN";
}

/** 환자 실명은 환자가 이 의사의 견적서를 수락한 뒤에만 보여준다 */
export function canDentistSeePatientName(ownQuotationStatus: string | null | undefined): boolean {
  return ownQuotationStatus === "ACCEPTED";
}
