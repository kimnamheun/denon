// 상담 예약 시간 겹침 계산 (순수 함수 — 테스트 대상)

export interface TimeSlot {
  scheduledAt: Date;
  /** 분 */
  duration: number;
}

const MIN_MS = 60 * 1000;

/** 두 예약이 1분이라도 겹치면 true. 앞 예약이 끝나는 시각에 바로 시작하는 건 겹치지 않는다. */
export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  const aStart = a.scheduledAt.getTime();
  const aEnd = aStart + a.duration * MIN_MS;
  const bStart = b.scheduledAt.getTime();
  const bEnd = bStart + b.duration * MIN_MS;
  return aStart < bEnd && bStart < aEnd;
}

/** 후보 예약과 겹치는 기존 예약이 있으면 그 예약을 돌려준다 */
export function findOverlap<T extends TimeSlot>(candidate: TimeSlot, existing: T[]): T | null {
  return existing.find((e) => slotsOverlap(candidate, e)) ?? null;
}

/** 상담 1건 최대 길이(분) — 겹침 조회 범위를 정할 때도 쓴다 */
export const MAX_CONSULTATION_MINUTES = 8 * 60;
