// 시술 카테고리 → 임플란트 개수 매핑 + 평균 견적가 계산

import { prisma } from "@/lib/prisma";

export interface CategoryInfo {
  key: string;
  emoji: string;
  title: string;
  desc: string;
  href: string;
  toothCount: number; // 평균 임플란트 개수 가정
}

export const CATEGORIES: ReadonlyArray<CategoryInfo> = [
  { key: "single", emoji: "🦷", title: "단일 임플란트", desc: "치아 1~2개", href: "/patient/quotation-requests/new?category=single", toothCount: 1 },
  { key: "multi", emoji: "🪥", title: "다수 임플란트", desc: "치아 3~6개", href: "/patient/quotation-requests/new?category=multi", toothCount: 4 },
  { key: "full", emoji: "😬", title: "전체 임플란트", desc: "전악 임플란트", href: "/patient/quotation-requests/new?category=full", toothCount: 14 },
  { key: "cosmetic", emoji: "✨", title: "심미 임플란트", desc: "앞니 임플란트", href: "/patient/quotation-requests/new?category=cosmetic", toothCount: 2 },
  { key: "immediate", emoji: "🩹", title: "당일 임플란트", desc: "발치 즉시", href: "/patient/quotation-requests/new?category=immediate", toothCount: 1 },
  { key: "bone-graft", emoji: "🦴", title: "뼈이식 임플란트", desc: "골이식 동반", href: "/patient/quotation-requests/new?category=bone-graft", toothCount: 1 },
];

/**
 * 카테고리별 평균 견적가 계산
 * - 시술 카테고리 분류가 DB 컬럼에 없으므로, 임플란트 평균 단가 × 가정 개수
 * - DB 데이터 부족 시 합리적 기본값 사용
 */
export async function getCategoryPrices(): Promise<Record<string, number>> {
  const agg = await prisma.quotationImplantItem.aggregate({
    _avg: { unitPrice: true },
  });

  // 평균 단가 (BigInt → Number 변환)
  const avgUnitPrice = agg._avg.unitPrice ? Number(agg._avg.unitPrice) : 1800000;

  // 카테고리별 추가 비용 가정 (당일/뼈이식은 추가 시술비)
  const ADDITIONAL_COST: Record<string, number> = {
    single: 0,
    multi: 0,
    full: 0,
    cosmetic: 200000, // 심미 마무리
    immediate: 300000, // 당일 시술비
    "bone-graft": 500000, // 골이식
  };

  const result: Record<string, number> = {};
  for (const c of CATEGORIES) {
    result[c.key] = avgUnitPrice * c.toothCount + (ADDITIONAL_COST[c.key] ?? 0);
  }
  return result;
}

/** 12,345,000원 → "약 1,234만원" */
export function formatApproxPrice(amount: number): string {
  const man = Math.round(amount / 10000);
  return `약 ${man.toLocaleString("ko-KR")}만원~`;
}
