// 의사 교육 이수 이력 표시 (환자 화면, 서버 컴포넌트)
// 관리자 확인(VERIFIED)된 것만, "○○ 과정 이수 · 기관 · 연월" 로 사실만 쓴다.

import { GraduationCap } from "lucide-react";

import { formatCredentialLine } from "@/lib/learning";
import type { PublicCredential } from "@/lib/learning-server";

export function CredentialList({
  credentials,
  max = 5,
  compact = false,
}: {
  credentials: ReadonlyArray<PublicCredential> | undefined;
  max?: number;
  compact?: boolean;
}) {
  if (!credentials || credentials.length === 0) return null;
  const shown = credentials.slice(0, max);
  const rest = credentials.length - shown.length;

  return (
    <ul className={compact ? "space-y-1" : "space-y-2"}>
      {shown.map((c) => (
        <li key={c.id} className={`flex items-start gap-2 ${compact ? "text-sm" : "text-base"}`}>
          <GraduationCap className={`${compact ? "h-4 w-4" : "h-5 w-5"} mt-0.5 shrink-0 text-emerald-600`} />
          <span>{formatCredentialLine(c)}</span>
        </li>
      ))}
      {rest > 0 && <li className="text-sm text-muted-foreground">외 {rest}건</li>}
    </ul>
  );
}
