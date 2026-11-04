// 면허 인증 전 의사에게 보여주는 안내 (서버 컴포넌트)
// 견적 요청에는 환자 건강정보가 들어 있어서 관리자 인증이 끝나야 열람할 수 있다.

import { ShieldAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function VerificationPending({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start gap-3 p-5">
        <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
        <div className="space-y-1">
          <p className="text-lg font-bold">면허 인증을 기다리고 있습니다</p>
          <p className="text-base text-muted-foreground">
            환자 견적 요청에는 건강정보가 들어 있어서, 관리자가 면허를 확인한 뒤부터 보고 견적서를 낼 수
            있습니다. 인증이 끝나면 이 화면에 견적 요청이 나타납니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
