// 술식 학습·이수 이력·환자용 술식 안내 규칙 테스트

import { describe, expect, it } from "vitest";

import {
  courseInputSchema,
  courseProgress,
  credentialReviewSchema,
  formatCredentialLine,
  hasMisleadingTitle,
  lessonInputSchema,
  offlineCredentialSchema,
  parseLessonVideo,
} from "@/lib/learning";
import { TREATMENT_PLAN_TAGS } from "@/lib/constants/quotation-form-options";
import { PROCEDURE_GUIDES, findGuidesInText, getProcedureGuide } from "@/lib/content/procedures";

describe("parseLessonVideo — 영상 주소", () => {
  it("YouTube 주소 여러 형태 → nocookie 임베드", () => {
    const want = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0";
    for (const u of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30",
    ]) {
      expect(parseLessonVideo(u)).toEqual({ kind: "embed", provider: "youtube", src: want });
    }
  });

  it("Vimeo 주소 (비공개 해시 포함) → 플레이어 주소", () => {
    expect(parseLessonVideo("https://vimeo.com/123456789")).toEqual({
      kind: "embed",
      provider: "vimeo",
      src: "https://player.vimeo.com/video/123456789",
    });
    expect(parseLessonVideo("https://vimeo.com/123456789/abcdef1234")?.src).toBe(
      "https://player.vimeo.com/video/123456789?h=abcdef1234",
    );
  });

  it("mp4 등 그 밖의 https 주소는 직접 재생", () => {
    expect(parseLessonVideo("https://cdn.example.com/a.mp4")).toEqual({
      kind: "file",
      src: "https://cdn.example.com/a.mp4",
    });
  });

  it("비었거나 http·javascript 주소는 재생하지 않는다", () => {
    expect(parseLessonVideo("")).toBeNull();
    expect(parseLessonVideo(null)).toBeNull();
    expect(parseLessonVideo("http://example.com/a.mp4")).toBeNull();
    expect(parseLessonVideo("javascript:alert(1)")).toBeNull();
    expect(parseLessonVideo("https://youtu.be/")).toBeNull();
  });
});

describe("courseProgress — 진도", () => {
  it("모두 마쳐야 완료", () => {
    expect(courseProgress(["a", "b"], ["a"])).toEqual({ done: 1, total: 2, percent: 50, complete: false });
    expect(courseProgress(["a", "b"], new Set(["a", "b", "x"]))).toEqual({
      done: 2,
      total: 2,
      percent: 100,
      complete: true,
    });
  });

  it("강의가 없는 과정은 완료로 보지 않는다", () => {
    expect(courseProgress([], [])).toEqual({ done: 0, total: 0, percent: 0, complete: false });
  });
});

describe("이수 이력 표시 문구", () => {
  it("과정명 이수 · 기관 · 연월", () => {
    expect(
      formatCredentialLine({ title: "상악동 거상술 과정", issuer: "오스템임플란트", completedOn: new Date("2026-05-03T00:00:00Z") }),
    ).toBe("상악동 거상술 과정 이수 · 오스템임플란트 · 2026.05");
  });

  it("'전문'·'명의' 같은 표현은 막는다", () => {
    expect(hasMisleadingTitle("임플란트 전문 과정")).toBe(true);
    expect(hasMisleadingTitle("임플란트 명의 과정")).toBe(true);
    expect(hasMisleadingTitle("임플란트 고급 연수회")).toBe(false);
  });
});

describe("입력 검증", () => {
  it("과정: 술식 태그는 견적서 시술 태그만", () => {
    const base = { title: "t", summary: "s", level: "BASIC" as const };
    expect(courseInputSchema.safeParse({ ...base, procedureTags: ["sinus"] }).success).toBe(true);
    expect(courseInputSchema.safeParse({ ...base, procedureTags: ["unknown"] }).success).toBe(false);
    expect(courseInputSchema.safeParse({ ...base, procedureTags: [] }).success).toBe(false);
  });

  it("강의: 영상 주소는 비우거나 https", () => {
    expect(lessonInputSchema.safeParse({ title: "t", videoUrl: "" }).success).toBe(true);
    expect(lessonInputSchema.safeParse({ title: "t", videoUrl: "https://youtu.be/dQw4w9WgXcQ" }).success).toBe(true);
    expect(lessonInputSchema.safeParse({ title: "t", videoUrl: "http://x.com/a.mp4" }).success).toBe(false);
  });

  it("오프라인 이수: 오해 소지 과정명 거절", () => {
    const base = { issuer: "오스템임플란트", completedOn: "2026-05-01", certificateUrl: "https://b.s3.x/a.jpg" };
    expect(offlineCredentialSchema.safeParse({ ...base, title: "상악동 연수회" }).success).toBe(true);
    expect(offlineCredentialSchema.safeParse({ ...base, title: "상악동 전문가 과정" }).success).toBe(false);
    expect(offlineCredentialSchema.safeParse({ ...base, title: "x", completedOn: "2026/05/01" }).success).toBe(false);
  });

  it("반려는 사유 필수", () => {
    expect(credentialReviewSchema.safeParse({ action: "VERIFY" }).success).toBe(true);
    expect(credentialReviewSchema.safeParse({ action: "REJECT", reason: "" }).success).toBe(false);
    expect(credentialReviewSchema.safeParse({ action: "REJECT", reason: "날짜 불일치" }).success).toBe(true);
  });
});

describe("환자용 술식 안내", () => {
  it("견적서 시술 태그마다 안내가 하나씩 있다", () => {
    for (const t of TREATMENT_PLAN_TAGS) {
      expect(getProcedureGuide(t.value), t.value).not.toBeNull();
    }
    expect(new Set(PROCEDURE_GUIDES.map((g) => g.tag)).size).toBe(PROCEDURE_GUIDES.length);
  });

  it("관련 시술은 모두 존재하는 안내를 가리킨다", () => {
    for (const g of PROCEDURE_GUIDES) {
      for (const r of g.related) expect(getProcedureGuide(r), `${g.tag}→${r}`).not.toBeNull();
    }
  });

  it("견적서 문장에서 시술을 찾는다", () => {
    const found = findGuidesInText(["발치, 뼈이식, 보철 (크라운)", "상악동 거상술", null]).map((g) => g.tag);
    expect(found).toEqual(["extract", "bone_graft", "sinus", "crown"]);
    expect(findGuidesInText(["지르코니아 크라운"]).map((g) => g.tag)).toEqual(["crown"]);
    expect(findGuidesInText([""])).toEqual([]);
  });

  it("환자 안내에 '전문'·'최고' 같은 광고성 표현이 없다", () => {
    const text = JSON.stringify(PROCEDURE_GUIDES);
    expect(/전문|최고|1위|보장|무통/.test(text)).toBe(false);
  });
});
