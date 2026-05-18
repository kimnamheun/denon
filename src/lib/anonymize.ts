// 개인정보 마스킹 유틸 (공개 영역 표시용)

/** "홍길동" → "홍**", "김민지수" → "김***" */
export function maskName(name: string | null | undefined): string {
  if (!name) return "익명";
  if (name.length <= 1) return name;
  return name[0] + "*".repeat(name.length - 1);
}

/** "12345678" → "1***5678" (이메일 등) */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return local + "@" + domain;
  return local[0] + "*".repeat(Math.min(3, local.length - 2)) + local.slice(-1) + "@" + domain;
}

/** 금액 범위 라벨 */
export function formatBudgetRange(min: bigint | null, max: bigint | null): string {
  if (min === null && max === null) return "예산 미정";
  const fmt = (v: bigint) => `${(Number(v) / 10000).toLocaleString("ko-KR")}만원`;
  if (min !== null && max !== null) return `${fmt(min)} ~ ${fmt(max)}`;
  if (min !== null) return `${fmt(min)} 이상`;
  return `${fmt(max!)} 이하`;
}

/** "2026-05-18T..." → "방금 전" / "3시간 전" / "어제" / "5월 18일" */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}
