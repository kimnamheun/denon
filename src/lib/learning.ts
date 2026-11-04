// 의사 술식 학습·이수 이력 공통 규칙 (순수 함수 — 테스트 대상)

import { z } from "zod";

import { TREATMENT_PLAN_TAGS } from "@/lib/constants/quotation-form-options";
import { EDUCATION_PROGRAMS } from "@/lib/content/education-programs";

export const PROCEDURE_TAG_VALUES = TREATMENT_PLAN_TAGS.map((t) => t.value);

export function procedureTagLabel(tag: string): string {
  return TREATMENT_PLAN_TAGS.find((t) => t.value === tag)?.label ?? tag;
}

export const LEVEL_LABEL: Record<string, string> = {
  BASIC: "기초",
  INTERMEDIATE: "중급",
  ADVANCED: "고급",
};

// ────────────────────────────────────────────────────────────
// 영상 주소
// ────────────────────────────────────────────────────────────

export type LessonVideo =
  | { kind: "embed"; provider: "youtube" | "vimeo"; src: string }
  | { kind: "file"; src: string };

/**
 * 강의 영상 주소를 재생 방식으로 바꾼다.
 * - YouTube·Vimeo 주소 → iframe 임베드 주소
 * - 그 밖의 https 주소(mp4 등) → <video> 로 직접 재생 (우리 S3 주소는 호출하는 쪽에서 서명 URL 로 바꿔 넘긴다)
 * - 비었거나 https 가 아니면 null (영상 준비 중)
 */
export function parseLessonVideo(url: string | null | undefined): LessonVideo | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;

  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id ? youtube(id) : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id =
      u.searchParams.get("v") ??
      u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ??
      null;
    return id ? youtube(id) : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(?:\/video)?\/(\d+)(?:\/([0-9a-f]+))?/);
    if (!m) return null;
    const hash = m[2] ?? u.searchParams.get("h");
    return {
      kind: "embed",
      provider: "vimeo",
      src: `https://player.vimeo.com/video/${m[1]}${hash ? `?h=${hash}` : ""}`,
    };
  }
  return { kind: "file", src: u.toString() };
}

function youtube(id: string): LessonVideo | null {
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
  return { kind: "embed", provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
}

// ────────────────────────────────────────────────────────────
// 진도
// ────────────────────────────────────────────────────────────

export interface CourseProgress {
  done: number;
  total: number;
  percent: number;
  complete: boolean;
}

/** 과정의 강의 id 목록과 의사가 마친 강의 id 목록으로 진도를 계산한다. 강의가 없으면 완료로 보지 않는다. */
export function courseProgress(
  lessonIds: ReadonlyArray<string>,
  completedLessonIds: ReadonlyArray<string> | ReadonlySet<string>,
): CourseProgress {
  const doneSet = completedLessonIds instanceof Set ? completedLessonIds : new Set(completedLessonIds);
  const total = lessonIds.length;
  const done = lessonIds.filter((id) => doneSet.has(id)).length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    complete: total > 0 && done === total,
  };
}

// ────────────────────────────────────────────────────────────
// 이수 이력 표시 — 환자 화면에는 사실만 쓴다 ("전문" 같은 표현 금지)
// ────────────────────────────────────────────────────────────

export function formatCredentialLine(c: { title: string; issuer: string; completedOn: Date | string }): string {
  const d = typeof c.completedOn === "string" ? new Date(c.completedOn) : c.completedOn;
  const ym = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${c.title} 이수 · ${c.issuer} · ${ym}`;
}

/** 과정명에 '전문' 같은 오해 소지 표현이 있으면 막는다 (의료광고 — 전문의 표방 금지) */
export function hasMisleadingTitle(title: string): boolean {
  return /전문|명의|최고|1위|보장/.test(title);
}

export const ONLINE_COURSE_ISSUER = "오스템임플란트 온라인 술식 과정";

// ────────────────────────────────────────────────────────────
// 입력 검증
// ────────────────────────────────────────────────────────────

const tagSchema = z.enum(PROCEDURE_TAG_VALUES as [string, ...string[]]);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식");

export const courseInputSchema = z.object({
  title: z.string().trim().min(1, "과정명을 입력하세요").max(200),
  summary: z.string().trim().min(1, "과정 소개를 입력하세요").max(5000),
  procedureTags: z.array(tagSchema).min(1, "연결할 술식을 1개 이상 고르세요"),
  level: z.enum(["BASIC", "INTERMEDIATE", "ADVANCED"]),
  instructor: z.string().trim().max(100).optional().or(z.literal("")),
  isPublished: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(9999).default(0),
});
export type CourseInput = z.infer<typeof courseInputSchema>;

export const lessonInputSchema = z.object({
  title: z.string().trim().min(1, "강의 제목을 입력하세요").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  videoUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || parseLessonVideo(v) !== null, "https 영상 주소를 넣어주세요 (YouTube·Vimeo·mp4)"),
  durationMin: z.number().int().min(1).max(600).optional(),
  displayOrder: z.number().int().min(0).max(9999).default(0),
});
export type LessonInput = z.infer<typeof lessonInputSchema>;

export const offlineCredentialSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "과정명을 입력하세요")
    .max(200)
    .refine((v) => !hasMisleadingTitle(v), "'전문'·'명의' 같은 표현은 쓸 수 없습니다. 수료증에 적힌 과정명을 그대로 넣어주세요"),
  issuer: z.string().trim().min(1, "주관 기관을 입력하세요").max(100),
  completedOn: dateSchema,
  certificateUrl: z.string().url("수료증 사진을 올려주세요"),
  /** 오스템 교육 프로그램을 골랐을 때 — 없으면 기타 연수 */
  programKey: z
    .string()
    .optional()
    .refine((v) => !v || EDUCATION_PROGRAMS.some((p) => p.key === v), "알 수 없는 교육 프로그램입니다"),
});
export type OfflineCredentialInput = z.infer<typeof offlineCredentialSchema>;

export const credentialReviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("VERIFY") }),
  z.object({ action: z.literal("REJECT"), reason: z.string().trim().min(1, "반려 사유를 입력하세요").max(500) }),
]);
