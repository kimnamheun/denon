// 의사 견적 요청 이용 불가 안내 — 면허 인증 대기 또는 월 이용권 필요 (서버 컴포넌트)

import Link from "next/link";
import { CreditCard } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { VerificationPending } from "@/components/dentist/verification-pending";
import type { AccessBlock } from "@/lib/dentist-access";
import { MONTHLY_PLAN, formatWon } from "@/lib/subscription";

export function DentistAccessNotice({ block, className }: { block: AccessBlock; className?: string }) {
  if (!block) return null;
  if (block === "NOT_VERIFIED") return <VerificationPending className={className} />;
  return (
    <Card className={className}>
      <CardContent className="flex items-start gap-3 p-5">
        <CreditCard className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" />
        <div className="space-y-2">
          <p className="text-lg font-bold">월 이용권이 필요합니다</p>
          <p className="text-base text-muted-foreground">
            견적 요청을 보고 견적서를 보내려면 월 이용권({formatWon(MONTHLY_PLAN.amount)})이 필요합니다. 술식 학습은 이용권 없이 쓸 수 있습니다.
          </p>
          <Link href="/dentist/subscription" className="inline-block text-base font-semibold text-blue-600 underline">
            이용권 등록하러 가기
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
