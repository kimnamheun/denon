// 의사 교육 이수 이력 표시 (환자 화면, 서버 컴포넌트)
// 관리자 확인(VERIFIED)된 것만, "○○ 과정 이수 · 기관 · 연월" 로 사실만 쓴다.
// 오스템 Basic·Master 장기 과정은 이름 앞에 표시를 붙여 먼저 보여준다.

import { GraduationCap } from "lucide-react";

import { formatCredentialLine } from "@/lib/learning";
import { TRACK_LABEL, getEducationProgram } from "@/lib/content/education-programs";
import type { PublicCredential } from "@/lib/learning-server";

const TRACK_ORDER: Record<string, number> = { MASTER: 0, BASIC: 1 };

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
  const withTrack = credentials.map((c) => {
    const program = getEducationProgram(c.programKey);
    const track = program && program.track !== "SINGLE" ? program.track : null;
    return { c, track };
  });
  // Master → Basic → 나머지 (각 묶음 안에서는 최근 순 유지)
  const sorted = [...withTrack].sort(
    (a, b) => (TRACK_ORDER[a.track ?? ""] ?? 9) - (TRACK_ORDER[b.track ?? ""] ?? 9),
  );
  const shown = sorted.slice(0, max);
  const rest = sorted.length - shown.length;

  return (
    <ul className={compact ? "space-y-1" : "space-y-2"}>
      {shown.map(({ c, track }) => (
        <li key={c.id} className={`flex items-start gap-2 ${compact ? "text-sm" : "text-base"}`}>
          <GraduationCap className={`${compact ? "h-4 w-4" : "h-5 w-5"} mt-0.5 shrink-0 text-emerald-600`} />
          <span>
            {track && (
              <span
                className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-xs font-bold ${
                  track === "MASTER" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                }`}
              >
                오스템 {TRACK_LABEL[track]}
              </span>
            )}
            {formatCredentialLine(c)}
          </span>
        </li>
      ))}
      {rest > 0 && <li className="text-sm text-muted-foreground">외 {rest}건</li>}
    </ul>
  );
}
