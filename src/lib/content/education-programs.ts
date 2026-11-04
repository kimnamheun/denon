// 오스템 교육 프로그램 (education.denall.com) — 술식 태그별 연결
//
// 일정·지역·강사는 자주 바뀌어서 여기 두지 않는다. 신청 화면(교육 사이트)으로 보내고,
// 이 앱은 "어떤 술식에 어떤 과정이 있는지"와 이수 이력의 이름만 맞춘다.
//
// key 는 DentistCredential.programKey 와 교육 사이트 이수 이력 연동(EDUCATION_SYNC)에서 같은 값을 쓴다.
// 과정별 신청 주소가 정해지면 applyUrl 만 바꾸면 된다.

export const EDUCATION_SITE_URL = "https://education.denall.com/course-apply";
export const EDUCATION_ISSUER = "오스템임플란트";

export type ProgramTrack = "BASIC" | "MASTER" | "SINGLE";

export interface EducationProgram {
  key: string;
  name: string;
  track: ProgramTrack;
  /** 연결 술식 — TREATMENT_PLAN_TAGS 의 value */
  tags: string[];
  summary: string;
  applyUrl: string;
}

export const TRACK_LABEL: Record<ProgramTrack, string> = {
  BASIC: "Basic",
  MASTER: "Master",
  SINGLE: "단과",
};

export const EDUCATION_PROGRAMS: ReadonlyArray<EducationProgram> = [
  {
    key: "IMPLANT_MC_BASIC",
    name: "Implant MC Basic",
    track: "BASIC",
    tags: ["implant", "ct", "abutment", "crown"],
    summary: "임플란트 Basic 장기 과정. 과정 내용과 일정은 교육 사이트에서 확인하세요.",
    applyUrl: EDUCATION_SITE_URL,
  },
  {
    key: "MASTER_COURSE",
    name: "Master Course",
    track: "MASTER",
    tags: ["implant", "bone_graft", "sinus", "extract", "abutment", "crown"],
    summary: "Basic → Surgery → Prosth. 단계로 몇 달에 걸쳐 진행하는 임플란트 심화 과정입니다.",
    applyUrl: EDUCATION_SITE_URL,
  },
  {
    key: "SINUS",
    name: "SINUS",
    track: "SINGLE",
    tags: ["sinus"],
    summary: "상악동 거상술 단과 과정.",
    applyUrl: EDUCATION_SITE_URL,
  },
  {
    key: "GBR",
    name: "GBR",
    track: "SINGLE",
    tags: ["bone_graft"],
    summary: "골유도재생술(뼈이식) 단과 과정.",
    applyUrl: EDUCATION_SITE_URL,
  },
  {
    key: "RESTORATION",
    name: "Restoration",
    track: "SINGLE",
    tags: ["abutment", "crown"],
    summary: "임플란트 보철 단과 과정.",
    applyUrl: EDUCATION_SITE_URL,
  },
  {
    key: "DIGITAL_MC",
    name: "Digital MC",
    track: "SINGLE",
    tags: ["ct", "implant"],
    summary: "디지털 장기 과정. 과정 내용과 일정은 교육 사이트에서 확인하세요.",
    applyUrl: EDUCATION_SITE_URL,
  },
];

const BY_KEY = new Map(EDUCATION_PROGRAMS.map((p) => [p.key, p]));

export function getEducationProgram(key: string | null | undefined): EducationProgram | null {
  return key ? BY_KEY.get(key) ?? null : null;
}

/** 술식 태그와 겹치는 프로그램 — Basic·Master 먼저, 그다음 단과 */
export function programsForTags(tags: ReadonlyArray<string>): EducationProgram[] {
  const order: Record<ProgramTrack, number> = { BASIC: 0, MASTER: 1, SINGLE: 2 };
  return EDUCATION_PROGRAMS.filter((p) => p.tags.some((t) => tags.includes(t))).sort(
    (a, b) => order[a.track] - order[b.track],
  );
}

/** Basic·Master 장기 과정만 */
export function coreTracks(): EducationProgram[] {
  return EDUCATION_PROGRAMS.filter((p) => p.track !== "SINGLE");
}
