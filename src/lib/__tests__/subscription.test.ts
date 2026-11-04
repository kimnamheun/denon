// 월 이용권·교육 프로그램·이수 연동 규칙 테스트

import { describe, expect, it } from "vitest";

import {
  MAX_RENEWAL_FAILURES,
  MONTHLY_PLAN,
  addMonthsKst,
  buildOrderId,
  isDueForRenewal,
  isSubscriptionActive,
  subscriptionEnforced,
  summarizeCard,
  type SubscriptionLike,
} from "@/lib/subscription";
import { openSecret, sealSecret, canSealSecrets } from "@/lib/crypto-box";
import { decideRequestAccess } from "@/lib/dentist-access";
import { bearerMatches } from "@/lib/cron-auth";
import { EDUCATION_PROGRAMS, coreTracks, getEducationProgram, programsForTags } from "@/lib/content/education-programs";
import { TREATMENT_PLAN_TAGS } from "@/lib/constants/quotation-form-options";
import { completionRecordSchema, parseCompletionCsv } from "@/lib/education-sync";

const DAY = 24 * 3600_000;

describe("월 이용권 — 기간", () => {
  it("금액은 9,900원 고정", () => {
    expect(MONTHLY_PLAN.amount).toBe(9900);
  });

  it("서울 달력 기준 한 달, 말일 맞춤", () => {
    // 서울 1/31 10:00 → 2/28 10:00
    expect(addMonthsKst(new Date("2027-01-31T01:00:00Z"), 1).toISOString()).toBe("2027-02-28T01:00:00.000Z");
    // 윤년 2028: 1/31 → 2/29
    expect(addMonthsKst(new Date("2028-01-31T01:00:00Z"), 1).toISOString()).toBe("2028-02-29T01:00:00.000Z");
    // 서울 11/30 23:30 (UTC 11/30 14:30) → 서울 12/30 23:30
    expect(addMonthsKst(new Date("2026-11-30T14:30:00Z"), 1).toISOString()).toBe("2026-12-30T14:30:00.000Z");
    // 서울 12/15 → 다음 해 1/15
    expect(addMonthsKst(new Date("2026-12-15T03:00:00Z"), 1).toISOString()).toBe("2027-01-15T03:00:00.000Z");
    expect(addMonthsKst(new Date("2026-01-15T03:00:00Z"), 3).toISOString()).toBe("2026-04-15T03:00:00.000Z");
  });
});

describe("월 이용권 — 유효 여부", () => {
  const now = new Date("2026-11-04T00:00:00Z");
  const sub = (over: Partial<SubscriptionLike>): SubscriptionLike => ({
    status: "ACTIVE",
    currentPeriodEnd: new Date(now.getTime() + DAY),
    ...over,
  });

  it("기간 안이면 유효, 지나면 무효", () => {
    expect(isSubscriptionActive(sub({}), now)).toBe(true);
    expect(isSubscriptionActive(sub({ currentPeriodEnd: new Date(now.getTime() - 1) }), now)).toBe(false);
  });

  it("해지해도 기간 끝까지 유효", () => {
    expect(isSubscriptionActive(sub({ status: "CANCELED" }), now)).toBe(true);
  });

  it("결제 실패는 3일 유예", () => {
    expect(isSubscriptionActive(sub({ status: "PAST_DUE", currentPeriodEnd: new Date(now.getTime() - 2 * DAY) }), now)).toBe(true);
    expect(isSubscriptionActive(sub({ status: "PAST_DUE", currentPeriodEnd: new Date(now.getTime() - 4 * DAY) }), now)).toBe(false);
  });

  it("카드 등록 전·만료·없음은 무효", () => {
    expect(isSubscriptionActive(sub({ status: "PENDING" }), now)).toBe(false);
    expect(isSubscriptionActive(sub({ status: "EXPIRED" }), now)).toBe(false);
    expect(isSubscriptionActive(null, now)).toBe(false);
    expect(isSubscriptionActive(sub({ currentPeriodEnd: null }), now)).toBe(false);
  });
});

describe("월 이용권 — 갱신 대상", () => {
  const now = new Date("2026-11-04T00:00:00Z");
  const base: SubscriptionLike = {
    status: "ACTIVE",
    source: "TOSS_BILLING",
    billingKeyEnc: "v1.x.y.z",
    cancelAtPeriodEnd: false,
    failedCount: 0,
    currentPeriodEnd: new Date(now.getTime() + 12 * 3600_000),
  };

  it("끝나기 하루 안쪽이면 갱신", () => {
    expect(isDueForRenewal(base, now)).toBe(true);
    expect(isDueForRenewal({ ...base, currentPeriodEnd: new Date(now.getTime() + 2 * DAY) }, now)).toBe(false);
  });

  it("해지 예약·카드 없음·무료 기간·재시도 초과는 갱신 안 함", () => {
    expect(isDueForRenewal({ ...base, cancelAtPeriodEnd: true }, now)).toBe(false);
    expect(isDueForRenewal({ ...base, billingKeyEnc: null }, now)).toBe(false);
    expect(isDueForRenewal({ ...base, source: "ADMIN_GRANT" }, now)).toBe(false);
    expect(isDueForRenewal({ ...base, failedCount: MAX_RENEWAL_FAILURES }, now)).toBe(false);
    expect(isDueForRenewal({ ...base, status: "PAST_DUE", failedCount: 1 }, now)).toBe(true);
  });
});

describe("월 이용권 — 주문번호·카드 표시·스위치", () => {
  it("같은 기간이면 같은 주문번호, 토스 형식(영문·숫자·-·_ 64자 이내)", () => {
    const a = buildOrderId("cmabc123", new Date("2026-11-04T05:00:00Z"));
    const b = buildOrderId("cmabc123", new Date("2026-11-04T09:00:00Z"));
    expect(a).toBe(b);
    expect(a).toBe("sub_cmabc123_20261104");
    expect(/^[A-Za-z0-9_-]{6,64}$/.test(a)).toBe(true);
    // 서울 날짜 기준 (UTC 11/04 16:00 = 서울 11/05)
    expect(buildOrderId("cmabc123", new Date("2026-11-04T16:00:00Z"))).toBe("sub_cmabc123_20261105");
  });

  it("카드 표시", () => {
    expect(summarizeCard("신한", "4330-12**-****-123*")).toBe("신한 · 4330-12**-****-123*");
    expect(summarizeCard(null, null)).toBeNull();
  });

  it("이용권 필수는 'true' 일 때만", () => {
    expect(subscriptionEnforced("true")).toBe(true);
    expect(subscriptionEnforced("1")).toBe(false);
    expect(subscriptionEnforced(undefined)).toBe(false);
  });
});

describe("견적 요청 이용 권한", () => {
  it("면허 인증이 먼저", () => {
    expect(decideRequestAccess({ isVerified: false, subscriptionActive: true, enforced: true })).toEqual({
      canUseRequests: false,
      block: "NOT_VERIFIED",
    });
  });
  it("이용권 필수가 켜졌을 때만 이용권 확인", () => {
    expect(decideRequestAccess({ isVerified: true, subscriptionActive: false, enforced: false }).canUseRequests).toBe(true);
    expect(decideRequestAccess({ isVerified: true, subscriptionActive: false, enforced: true })).toEqual({
      canUseRequests: false,
      block: "NO_SUBSCRIPTION",
    });
    expect(decideRequestAccess({ isVerified: true, subscriptionActive: true, enforced: true }).canUseRequests).toBe(true);
  });
});

describe("billingKey 암호화", () => {
  const key = Buffer.alloc(32, 7).toString("base64");

  it("암호화 → 복호화", () => {
    const sealed = sealSecret("bln_test_123", key);
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("bln_test_123");
    expect(openSecret(sealed, key)).toBe("bln_test_123");
  });

  it("같은 값도 매번 다른 암호문", () => {
    expect(sealSecret("x", key)).not.toBe(sealSecret("x", key));
  });

  it("다른 키·변조는 풀리지 않는다", () => {
    const sealed = sealSecret("bln_test_123", key);
    expect(() => openSecret(sealed, Buffer.alloc(32, 8).toString("base64"))).toThrow();
    const parts = sealed.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => openSecret(parts.join("."), key)).toThrow();
  });

  it("키가 없거나 길이가 틀리면 쓸 수 없다", () => {
    expect(canSealSecrets(undefined)).toBe(false);
    expect(canSealSecrets(Buffer.alloc(16).toString("base64"))).toBe(false);
    expect(canSealSecrets(key)).toBe(true);
  });
});

describe("서버 간 Bearer 인증", () => {
  const req = (auth?: string) => new Request("https://x/api", { headers: auth ? { authorization: auth } : {} });
  it("값이 같아야 통과, 비밀값 없으면 거절", () => {
    expect(bearerMatches(req("Bearer k1"), "k1")).toBe(true);
    expect(bearerMatches(req("Bearer k2"), "k1")).toBe(false);
    expect(bearerMatches(req(), "k1")).toBe(false);
    expect(bearerMatches(req("Bearer "), undefined)).toBe(false);
  });
});

describe("오스템 교육 프로그램", () => {
  it("키는 겹치지 않고, 연결 술식은 견적서 시술 태그만", () => {
    expect(new Set(EDUCATION_PROGRAMS.map((p) => p.key)).size).toBe(EDUCATION_PROGRAMS.length);
    const tags = new Set(TREATMENT_PLAN_TAGS.map((t) => t.value));
    for (const p of EDUCATION_PROGRAMS) for (const t of p.tags) expect(tags.has(t), `${p.key}:${t}`).toBe(true);
  });

  it("Basic·Master 장기 과정", () => {
    expect(coreTracks().map((p) => p.key)).toEqual(["IMPLANT_MC_BASIC", "MASTER_COURSE"]);
  });

  it("술식별 과정 — 장기 과정 먼저", () => {
    expect(programsForTags(["sinus"]).map((p) => p.key)).toEqual(["MASTER_COURSE", "SINUS"]);
    expect(programsForTags(["scaling"])).toEqual([]);
    expect(getEducationProgram("GBR")?.name).toBe("GBR");
    expect(getEducationProgram(null)).toBeNull();
  });
});

describe("교육 사이트 이수 이력 연동", () => {
  it("CSV — 쉼표·탭, 따옴표 칸", () => {
    const r = parseCompletionCsv(
      'externalId,licenseNumber,programKey,title,completedOn\nE1,LIC-1,MASTER_COURSE,,2026-05-30\nE2,LIC-2,,"GBR, 심화",2026-06-01\n',
    );
    expect(r.error).toBeUndefined();
    expect(r.records).toEqual([
      { externalId: "E1", licenseNumber: "LIC-1", programKey: "MASTER_COURSE", title: "", completedOn: "2026-05-30" },
      { externalId: "E2", licenseNumber: "LIC-2", programKey: "", title: "GBR, 심화", completedOn: "2026-06-01" },
    ]);
    const tab = parseCompletionCsv("externalId\tlicenseNumber\tcompletedOn\nE3\tLIC-3\t2026-07-01");
    expect(tab.records[0]).toEqual({ externalId: "E3", licenseNumber: "LIC-3", completedOn: "2026-07-01" });
  });

  it("CSV — 필수 머리글이 없으면 오류", () => {
    expect(parseCompletionCsv("licenseNumber,completedOn\nLIC,2026-01-01").error).toContain("externalId");
    expect(parseCompletionCsv("externalId,licenseNumber,completedOn").error).toBeTruthy();
  });

  it("레코드 형식", () => {
    expect(completionRecordSchema.safeParse({ externalId: "E1", licenseNumber: "L", completedOn: "2026-05-30" }).success).toBe(true);
    expect(completionRecordSchema.safeParse({ externalId: "E1", licenseNumber: "L", completedOn: "2026/05/30" }).success).toBe(false);
    expect(completionRecordSchema.safeParse({ externalId: "", licenseNumber: "L", completedOn: "2026-05-30" }).success).toBe(false);
  });
});
