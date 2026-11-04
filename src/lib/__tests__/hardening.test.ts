// 보안·정합성 보강 규칙 테스트 — 날짜(서울 기준), 업로드 URL, 예약 겹침, 의사 열람 권한, cron 인증

import { describe, expect, it } from "vitest";

import {
  addDays,
  isDbDateBeforeToday,
  kstDateString,
  kstEndOfDay,
  kstStartOfDay,
  kstTodayAsDbDate,
} from "@/lib/kst";
import { buildUploadKey, isOwnUploadUrl, keyFromStoredUrl } from "@/lib/upload-url";
import { findOverlap, slotsOverlap } from "@/lib/schedule";
import { canDentistSeePatientName, canDentistViewRequest } from "@/lib/dentist-access";
import { isAuthorizedCron } from "@/lib/cron-auth";

describe("kst — 서울 기준 날짜", () => {
  it("UTC 15:00 은 서울 다음날 00:00 이다", () => {
    const base = new Date("2026-11-04T15:00:00.000Z"); // 서울 11/05 00:00
    expect(kstDateString(base)).toBe("2026-11-05");
    expect(kstStartOfDay(base).toISOString()).toBe("2026-11-04T15:00:00.000Z");
    expect(kstEndOfDay(base).toISOString()).toBe("2026-11-05T15:00:00.000Z");
  });

  it("UTC 14:59 는 아직 서울 같은 날이다", () => {
    const base = new Date("2026-11-04T14:59:59.000Z"); // 서울 11/04 23:59
    expect(kstDateString(base)).toBe("2026-11-04");
    expect(kstStartOfDay(base).toISOString()).toBe("2026-11-03T15:00:00.000Z");
  });

  it("DATE 컬럼 비교 — 오늘까지는 유효, 어제부터 지남", () => {
    const base = new Date("2026-11-04T01:00:00.000Z"); // 서울 11/04 10:00
    expect(kstTodayAsDbDate(base).toISOString()).toBe("2026-11-04T00:00:00.000Z");
    expect(isDbDateBeforeToday(new Date("2026-11-04T00:00:00.000Z"), base)).toBe(false);
    expect(isDbDateBeforeToday(new Date("2026-11-03T00:00:00.000Z"), base)).toBe(true);
  });

  it("addDays", () => {
    expect(addDays(new Date("2026-11-04T00:00:00.000Z"), 30).toISOString()).toBe(
      "2026-12-04T00:00:00.000Z",
    );
  });
});

describe("upload-url — 업로드 파일 URL", () => {
  const bucket = "dental-bucket";
  const region = "ap-northeast-2";
  const base = `https://${bucket}.s3.${region}.amazonaws.com/`;
  const key = buildUploadKey("user1", "jpeg", 1700000000000, "uuid-1");

  it("key 형식", () => {
    expect(key).toBe("quotation-requests/user1/1700000000000_uuid-1.jpeg");
  });

  it("우리 버킷 URL 에서 key 를 꺼낸다 (쿼리스트링 무시)", () => {
    expect(keyFromStoredUrl(`${base}${key}`, bucket, region)).toBe(key);
    expect(keyFromStoredUrl(`${base}${key}?X-Amz-Signature=abc`, bucket, region)).toBe(key);
  });

  it("외부 URL·경로 조작은 key 로 보지 않는다", () => {
    expect(keyFromStoredUrl("https://images.example.com/a.jpg", bucket, region)).toBeNull();
    expect(keyFromStoredUrl(`${base}`, bucket, region)).toBeNull();
    expect(keyFromStoredUrl(`${base}quotation-requests/../secret`, bucket, region)).toBeNull();
  });

  it("본인 폴더 파일만 본인 업로드로 인정", () => {
    expect(isOwnUploadUrl(`${base}${key}`, "user1", bucket, region)).toBe(true);
    expect(isOwnUploadUrl(`${base}${key}`, "user2", bucket, region)).toBe(false);
    // user1 로 시작하는 다른 사용자 id (user10) 폴더는 안 된다
    expect(
      isOwnUploadUrl(`${base}quotation-requests/user10/x.jpeg`, "user1", bucket, region),
    ).toBe(false);
    expect(isOwnUploadUrl("https://evil.example.com/x.jpeg", "user1", bucket, region)).toBe(false);
  });
});

describe("schedule — 상담 예약 겹침", () => {
  const at = (iso: string, duration = 60) => ({ scheduledAt: new Date(iso), duration });

  it("시간이 일부라도 겹치면 겹침", () => {
    expect(slotsOverlap(at("2026-11-05T01:00:00Z"), at("2026-11-05T01:30:00Z"))).toBe(true);
    expect(slotsOverlap(at("2026-11-05T01:00:00Z", 120), at("2026-11-05T01:30:00Z", 10))).toBe(true);
  });

  it("앞 예약이 끝나는 시각에 시작하면 겹치지 않음", () => {
    expect(slotsOverlap(at("2026-11-05T01:00:00Z"), at("2026-11-05T02:00:00Z"))).toBe(false);
    expect(slotsOverlap(at("2026-11-05T02:00:00Z"), at("2026-11-05T01:00:00Z"))).toBe(false);
  });

  it("findOverlap 은 겹치는 첫 예약을 돌려준다", () => {
    const existing = [at("2026-11-05T00:00:00Z"), at("2026-11-05T03:00:00Z")];
    expect(findOverlap(at("2026-11-05T01:00:00Z"), existing)).toBeNull();
    expect(findOverlap(at("2026-11-05T02:30:00Z"), existing)).toBe(existing[1]);
  });
});

describe("dentist-access — 의사 열람 권한", () => {
  it("미인증 의사는 열린 요청도 못 본다", () => {
    expect(
      canDentistViewRequest({ isVerified: false, requestStatus: "OPEN", hasOwnQuotation: false }),
    ).toBe(false);
  });

  it("인증 의사는 열린 요청만 본다", () => {
    expect(
      canDentistViewRequest({ isVerified: true, requestStatus: "OPEN", hasOwnQuotation: false }),
    ).toBe(true);
    expect(
      canDentistViewRequest({ isVerified: true, requestStatus: "IN_PROGRESS", hasOwnQuotation: false }),
    ).toBe(false);
  });

  it("내가 견적서를 낸 요청은 마감 뒤에도 본다", () => {
    expect(
      canDentistViewRequest({ isVerified: true, requestStatus: "IN_PROGRESS", hasOwnQuotation: true }),
    ).toBe(true);
  });

  it("환자 실명은 내 견적서가 수락된 경우에만", () => {
    expect(canDentistSeePatientName("ACCEPTED")).toBe(true);
    expect(canDentistSeePatientName("PENDING")).toBe(false);
    expect(canDentistSeePatientName(undefined)).toBe(false);
  });
});

describe("cron-auth — Vercel Cron 인증", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://example.com/api/cron/expire", { headers });

  it("CRON_SECRET 이 없으면 항상 거절", () => {
    expect(isAuthorizedCron(req({ authorization: "Bearer x" }), undefined)).toBe(false);
  });

  it("User-Agent 만으로는 통과하지 못한다", () => {
    expect(isAuthorizedCron(req({ "user-agent": "vercel-cron/1.0" }), "s3cret")).toBe(false);
  });

  it("Bearer 값이 맞아야 통과", () => {
    expect(isAuthorizedCron(req({ authorization: "Bearer s3cret" }), "s3cret")).toBe(true);
    expect(isAuthorizedCron(req({ authorization: "Bearer wrong!" }), "s3cret")).toBe(false);
  });
});
