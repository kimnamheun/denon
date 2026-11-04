// 서울 시간(KST, UTC+9) 기준 날짜 계산
// Vercel 서버는 UTC 로 돌기 때문에 `setHours(0,0,0,0)` 같은 서버 로컬 시간 계산은
// 하루가 9시간 어긋난다. 날짜 경계가 필요한 곳은 모두 이 함수들을 쓴다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 서울 기준 그날 00:00 (UTC Date 로 반환) */
export function kstStartOfDay(base: Date = new Date()): Date {
  const kst = new Date(base.getTime() + KST_OFFSET_MS);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - KST_OFFSET_MS);
}

/** 서울 기준 다음날 00:00 — 범위 조회 시 `lt` 로 쓴다 */
export function kstEndOfDay(base: Date = new Date()): Date {
  return new Date(kstStartOfDay(base).getTime() + DAY_MS);
}

/** 서울 기준 날짜 문자열 YYYY-MM-DD */
export function kstDateString(base: Date = new Date()): string {
  return new Date(base.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * `@db.Date` 컬럼(예: Quotation.validUntil) 비교용 — 서울 기준 오늘 날짜를 UTC 자정 Date 로.
 * Prisma 는 DATE 컬럼을 UTC 자정 Date 로 읽고 쓰므로 이 값과 그대로 비교하면 된다.
 */
export function kstTodayAsDbDate(base: Date = new Date()): Date {
  return new Date(`${kstDateString(base)}T00:00:00.000Z`);
}

/** DATE 컬럼 값이 서울 기준 오늘보다 이전이면 true (유효기간 지남) */
export function isDbDateBeforeToday(date: Date, base: Date = new Date()): boolean {
  return date.getTime() < kstTodayAsDbDate(base).getTime();
}

/** 날짜에 일 수를 더한다 */
export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY_MS);
}
