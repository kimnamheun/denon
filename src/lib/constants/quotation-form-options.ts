/**
 * 의사 견적서 작성 폼의 옵션 데이터.
 * 자유 입력 박스 대신 미리 정의된 옵션을 제공해 입력 속도/일관성 향상.
 */

/* ── 임플란트 브랜드 (자주 처방되는 순) ────────────────────── */
export interface BrandOption {
  value: string;        // 표시 + 저장 값
  detail: string;       // 부가 정보 (국가/특징)
}

export const DENTIST_IMPLANT_BRANDS: ReadonlyArray<BrandOption> = [
  { value: "오스템", detail: "국산" },
  { value: "스트라우만", detail: "스위스" },
  { value: "노벨바이오케어", detail: "스위스" },
  { value: "디오", detail: "국산" },
  { value: "메가젠", detail: "국산" },
  { value: "덴티움", detail: "국산" },
];

/* ── 치료 기간 ─────────────────────────────────────────────── */
export interface DurationOption {
  value: number; // 개월 (대표값)
  label: string;
}

export const TREATMENT_DURATION_OPTIONS: ReadonlyArray<DurationOption> = [
  { value: 1, label: "1개월" },
  { value: 3, label: "2~3개월" },
  { value: 6, label: "4~6개월" },
  { value: 9, label: "6개월 이상" },
];

/* ── 보증 기간 ─────────────────────────────────────────────── */
export interface WarrantyOption {
  value: number; // 년 (99 = 평생)
  label: string;
}

export const WARRANTY_OPTIONS: ReadonlyArray<WarrantyOption> = [
  { value: 1, label: "1년" },
  { value: 3, label: "3년" },
  { value: 5, label: "5년" },
  { value: 10, label: "10년" },
  { value: 99, label: "평생 보증" },
];

/* ── 할인율 ────────────────────────────────────────────────── */
export interface DiscountOption {
  value: number; // %
  label: string;
}

export const DISCOUNT_OPTIONS: ReadonlyArray<DiscountOption> = [
  { value: 0, label: "할인 없음" },
  { value: 5, label: "5%" },
  { value: 10, label: "10%" },
  { value: 15, label: "15%" },
  { value: 20, label: "20%" },
];

/* ── 견적 유효기간 (오늘로부터 N일) ──────────────────────── */
export interface ValidUntilOption {
  days: number;
  label: string;
}

export const VALID_UNTIL_OPTIONS: ReadonlyArray<ValidUntilOption> = [
  { days: 7, label: "1주" },
  { days: 14, label: "2주" },
  { days: 30, label: "1개월" },
  { days: 60, label: "2개월" },
];

/* ── 치료 계획 자주 쓰는 시술 태그 ─────────────────────────── */
export interface TreatmentTag {
  value: string;
  label: string;
}

export const TREATMENT_PLAN_TAGS: ReadonlyArray<TreatmentTag> = [
  { value: "extract", label: "발치" },
  { value: "bone_graft", label: "뼈이식" },
  { value: "sinus", label: "상악동 거상술" },
  { value: "implant", label: "임플란트 식립" },
  { value: "abutment", label: "지대주 연결" },
  { value: "crown", label: "보철 (크라운)" },
  { value: "ct", label: "CT 촬영" },
  { value: "anesthesia", label: "수면마취" },
  { value: "scaling", label: "스케일링" },
  { value: "checkup", label: "정기 검진" },
];

/* ── 자주 추가하는 항목 preset (한 번 클릭으로 추가) ───── */
export interface AdditionalItemPreset {
  description: string;
  price: number;
}

export const ADDITIONAL_ITEM_PRESETS: ReadonlyArray<AdditionalItemPreset> = [
  { description: "CT 촬영", price: 50_000 },
  { description: "뼈이식술 (자가골)", price: 500_000 },
  { description: "뼈이식술 (이종골)", price: 300_000 },
  { description: "상악동 거상술", price: 800_000 },
  { description: "지르코니아 크라운", price: 600_000 },
  { description: "PFM 크라운", price: 400_000 },
  { description: "수면마취", price: 200_000 },
  { description: "장기 보증 옵션 (+5년)", price: 100_000 },
];

/* ── 도우미: days 후의 ISO 날짜 문자열 (yyyy-MM-dd) ─────── */
export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
