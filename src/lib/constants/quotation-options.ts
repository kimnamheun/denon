/**
 * 견적의뢰 폼의 선택 옵션 데이터.
 * 노년층 친화 UX 를 위해 자유 텍스트 입력 대신 미리 정의된 옵션을 제공한다.
 *
 * `popular` 가 true 인 항목은 "👑 많이 선택해요" 라벨이 붙는다.
 * 현재는 hard-code 이고, 추후 DB 통계 기반으로 동적 정렬 가능.
 */

export interface PopularOption<T extends string = string> {
  value: T;
  label: string;
  popular?: boolean;
  description?: string;
}

/* ── 증상 (다중 선택) ─────────────────────────────────────── */
export const SYMPTOM_OPTIONS: PopularOption[] = [
  { value: "chewing_pain", label: "씹을 때 아파요", popular: true },
  { value: "gum_swelling", label: "잇몸이 부었어요", popular: true },
  { value: "tooth_loose", label: "이가 흔들려요" },
  { value: "sensitive_temp", label: "차갑거나 뜨거운 음식이 시려요" },
  { value: "tooth_lost", label: "이가 빠졌어요 / 빠질 것 같아요" },
  { value: "gum_bleeding", label: "잇몸에서 피가 나요" },
  { value: "implant_issue", label: "기존 임플란트가 문제 있어요" },
  { value: "bad_breath", label: "입에서 냄새가 나요" },
];

/* ── 치료 이력 (다중 선택, 체크박스 성격) ───────────────── */
export const TREATMENT_HISTORY_OPTIONS: PopularOption[] = [
  { value: "first_visit", label: "치과는 처음이에요", popular: true },
  { value: "scaling", label: "스케일링 받은 적 있어요" },
  { value: "cavity", label: "충치 치료 받은 적 있어요" },
  { value: "nerve", label: "신경치료 받은 적 있어요" },
  { value: "extraction", label: "이를 뽑은 적 있어요" },
  { value: "implant_exist", label: "임플란트가 이미 있어요" },
  { value: "orthodontic", label: "교정 받은 적 있어요" },
  { value: "denture", label: "틀니를 쓰고 있어요" },
];

/* ── 시급도 (단일 선택) ───────────────────────────────────── */
export const URGENCY_OPTIONS = [
  { value: "LOW", label: "여유 있어요", description: "한 달 이상 천천히" },
  { value: "MEDIUM", label: "보통이에요", description: "2주 안에는 받고 싶어요", popular: true },
  { value: "HIGH", label: "급해요", description: "1주 안에 받고 싶어요" },
] as const;

export type UrgencyValue = (typeof URGENCY_OPTIONS)[number]["value"];

/* ── 예산 범위 (단일 선택) ────────────────────────────────── */
export interface BudgetOption {
  value: string;
  label: string;
  /** 원 단위. null 이면 미정 */
  min: number | null;
  max: number | null;
  popular?: boolean;
}

export const BUDGET_OPTIONS: BudgetOption[] = [
  { value: "under_100", label: "100만원 이하", min: null, max: 1_000_000 },
  { value: "100_200", label: "100 ~ 200만원", min: 1_000_000, max: 2_000_000 },
  { value: "200_300", label: "200 ~ 300만원", min: 2_000_000, max: 3_000_000, popular: true },
  { value: "300_500", label: "300 ~ 500만원", min: 3_000_000, max: 5_000_000 },
  { value: "over_500", label: "500만원 이상", min: 5_000_000, max: null },
  { value: "consult", label: "상담 후에 결정할게요", min: null, max: null, popular: true },
];

/* ── 임플란트 브랜드 (단일 선택) ──────────────────────────── */
export const BRAND_OPTIONS: PopularOption[] = [
  { value: "any", label: "잘 모르겠어요 / 추천해 주세요", popular: true },
  { value: "osstem", label: "오스템 (국산, 가성비)", popular: true },
  { value: "straumann", label: "스트라우만 (스위스, 프리미엄)" },
  { value: "nobel", label: "노벨바이오케어 (스위스)" },
  { value: "dio", label: "디오 (국산)" },
];

/* ── 병원 유형 (단일 선택) ────────────────────────────────── */
export const HOSPITAL_TYPE_OPTIONS: PopularOption[] = [
  { value: "any", label: "상관없어요", popular: true },
  { value: "neighborhood", label: "동네 치과 (가까운 곳)", popular: true },
  { value: "big", label: "큰 종합 치과" },
  { value: "university", label: "대학병원" },
];

/* ── 도우미: budget value 로부터 min/max 추출 ─────────────── */
export function getBudgetRange(budgetValue: string | null): {
  min: number | null;
  max: number | null;
} {
  if (!budgetValue) return { min: null, max: null };
  const opt = BUDGET_OPTIONS.find((b) => b.value === budgetValue);
  return opt ? { min: opt.min, max: opt.max } : { min: null, max: null };
}

/* ── 도우미: 옵션 값을 한글 라벨로 변환 (요약 화면용) ─────── */
export function labelsOf<T extends { value: string; label: string }>(
  options: ReadonlyArray<T>,
  values: string[],
): string[] {
  return values
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter((l): l is string => Boolean(l));
}
