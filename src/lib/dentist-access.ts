// 의사 권한 확인 — 면허 인증(isVerified) 전에는 환자 견적 요청을 볼 수 없다.
//
// 견적 요청에는 증상·치료 이력·구강 사진 같은 건강정보가 들어 있어서,
// 관리자가 면허를 확인한 의사에게만 보여준다.

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export interface DentistAccess {
  exists: boolean;
  isVerified: boolean;
  clinicId: string | null;
}

export async function getDentistAccess(dentistId: string): Promise<DentistAccess> {
  const d = await prisma.dentist.findUnique({
    where: { id: dentistId },
    select: { isVerified: true, clinicId: true },
  });
  return {
    exists: Boolean(d),
    isVerified: d?.isVerified ?? false,
    clinicId: d?.clinicId ?? null,
  };
}

export const NOT_VERIFIED_MESSAGE =
  "면허 인증이 끝난 뒤 이용할 수 있습니다. 관리자 승인을 기다려 주세요.";

export function notVerifiedResponse() {
  return NextResponse.json(
    { error: "DENTIST_NOT_VERIFIED", message: NOT_VERIFIED_MESSAGE },
    { status: 403 },
  );
}

/**
 * 의사가 이 견적 요청을 볼 수 있는지.
 * - 이미 견적서를 낸 요청이면 상태와 관계없이 볼 수 있다 (자기 견적의 맥락).
 * - 아니면 인증된 의사 + 아직 열려 있는(OPEN) 요청만.
 */
export function canDentistViewRequest(opts: {
  isVerified: boolean;
  requestStatus: string;
  hasOwnQuotation: boolean;
}): boolean {
  if (opts.hasOwnQuotation) return true;
  return opts.isVerified && opts.requestStatus === "OPEN";
}

/** 환자 실명은 환자가 이 의사의 견적서를 수락한 뒤에만 보여준다 */
export function canDentistSeePatientName(ownQuotationStatus: string | null | undefined): boolean {
  return ownQuotationStatus === "ACCEPTED";
}
