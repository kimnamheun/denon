// 견적 요청의 치아 정보 — QuotationRequestMissingTooth.toothNumber 한 칸에 담는 값
//
//   "36"      정확한 치아 (FDI 번호)
//   "Z:LL:2"  부위 + 개수 — 어느 치아인지는 모를 때 (1~3개)
//   "Z:LL:A"  부위 전부
//   "E:U"     위(U)·아래(L) 치아가 거의 없음
//   "D:U"     위(U)·아래(L) 틀니 사용 중
//   "P"       위치를 모름 — 사진·상담으로 확인
//
// 해커톤 MVP 에서는 DB 열을 늘리지 않고 같은 표에 담는다.
// 값을 해석·표시·검증하는 곳은 이 파일 함수만 쓴다.

export type Arch = "U" | "L";
export type ZoneId = "UR" | "UF" | "UL" | "LR" | "LF" | "LL";

export interface Zone {
  id: ZoneId;
  arch: Arch;
  /** 환자에게 보이는 이름 */
  label: string;
  /** 입 모양 지도 칸에 쓰는 짧은 이름 */
  short: string;
  /** 화면(거울 보듯) 왼쪽→오른쪽 순서 */
  teeth: string[];
  /** 사랑니 — 어금니 부위만, 기본 숨김 */
  wisdom?: string;
  /** 사랑니를 보일 때 줄의 어느 끝에 붙는지 */
  wisdomAt?: "start" | "end";
}

// 화면 오른쪽 = 환자 오른쪽 (거울을 볼 때처럼). 치과 차트(정면 시점)와 좌우가 반대다.
export const ZONES: Record<ZoneId, Zone> = {
  UL: { id: "UL", arch: "U", label: "위 왼쪽 어금니", short: "왼쪽\n어금니", teeth: ["27", "26", "25", "24"], wisdom: "28", wisdomAt: "start" },
  UF: { id: "UF", arch: "U", label: "위 앞니", short: "앞니", teeth: ["23", "22", "21", "11", "12", "13"] },
  UR: { id: "UR", arch: "U", label: "위 오른쪽 어금니", short: "오른쪽\n어금니", teeth: ["14", "15", "16", "17"], wisdom: "18", wisdomAt: "end" },
  LL: { id: "LL", arch: "L", label: "아래 왼쪽 어금니", short: "왼쪽\n어금니", teeth: ["37", "36", "35", "34"], wisdom: "38", wisdomAt: "start" },
  LF: { id: "LF", arch: "L", label: "아래 앞니", short: "앞니", teeth: ["33", "32", "31", "41", "42", "43"] },
  LR: { id: "LR", arch: "L", label: "아래 오른쪽 어금니", short: "오른쪽\n어금니", teeth: ["44", "45", "46", "47"], wisdom: "48", wisdomAt: "end" },
};

/** 입 모양 지도 배치 (화면 왼쪽→오른쪽) */
export const ZONE_ROWS: Record<Arch, ZoneId[]> = {
  U: ["UL", "UF", "UR"],
  L: ["LL", "LF", "LR"],
};

export const ARCH_LABEL: Record<Arch, string> = { U: "위", L: "아래" };

export type ToothEntry =
  | { kind: "tooth"; fdi: string; zone: ZoneId }
  | { kind: "area"; zone: ZoneId; count: 1 | 2 | 3 | "all" }
  | { kind: "edentulous"; arch: Arch }
  | { kind: "denture"; arch: Arch }
  | { kind: "unsure" };

const TOOTH_ZONE = new Map<string, ZoneId>();
for (const z of Object.values(ZONES)) {
  for (const t of z.teeth) TOOTH_ZONE.set(t, z.id);
  if (z.wisdom) TOOTH_ZONE.set(z.wisdom, z.id);
}

export function zoneOfTooth(fdi: string): ZoneId | null {
  return TOOTH_ZONE.get(fdi) ?? null;
}

export function parseToothEntry(code: string): ToothEntry | null {
  const zone = zoneOfTooth(code);
  if (zone) return { kind: "tooth", fdi: code, zone };
  if (code === "P") return { kind: "unsure" };

  let m = /^Z:(UR|UF|UL|LR|LF|LL):([123A])$/.exec(code);
  if (m) {
    const count = m[2] === "A" ? "all" : (Number(m[2]) as 1 | 2 | 3);
    return { kind: "area", zone: m[1] as ZoneId, count };
  }
  m = /^([ED]):([UL])$/.exec(code);
  if (m) return { kind: m[1] === "E" ? "edentulous" : "denture", arch: m[2] as Arch };
  return null;
}

export function isValidToothEntry(code: string): boolean {
  return parseToothEntry(code) !== null;
}

export const areaCode = (zone: ZoneId, count: 1 | 2 | 3 | "all") =>
  `Z:${zone}:${count === "all" ? "A" : count}`;
export const archCode = (kind: "E" | "D", arch: Arch) => `${kind}:${arch}`;
export const UNSURE_CODE = "P";

const POSITION_NAME: Record<string, string> = {
  "1": "가운데 앞니",
  "2": "옆 앞니",
  "3": "송곳니",
  "4": "첫째 작은어금니",
  "5": "둘째 작은어금니",
  "6": "첫째 큰어금니",
  "7": "둘째 큰어금니",
  "8": "사랑니",
};

/** "아래 왼쪽 첫째 큰어금니" — 화면 읽기 프로그램·설명용 */
export function toothName(fdi: string): string {
  const quadrant = fdi[0];
  const arch = quadrant === "1" || quadrant === "2" ? "위" : "아래";
  const side = quadrant === "1" || quadrant === "4" ? "오른쪽" : "왼쪽";
  return `${arch} ${side} ${POSITION_NAME[fdi[1]] ?? fdi}`;
}

function zoneSize(zone: ZoneId) {
  return ZONES[zone].teeth.length;
}

const sortFdi = (a: string, b: string) => Number(a) - Number(b);

interface Grouped {
  /** 부위별 정확한 치아 */
  teethByZone: Map<ZoneId, string[]>;
  /** 부위별 개수만 아는 값 */
  areas: Map<ZoneId, 1 | 2 | 3 | "all">;
  edentulous: Set<Arch>;
  denture: Set<Arch>;
  unsure: boolean;
}

function group(codes: readonly string[]): Grouped {
  const g: Grouped = { teethByZone: new Map(), areas: new Map(), edentulous: new Set(), denture: new Set(), unsure: false };
  for (const code of codes) {
    const e = parseToothEntry(code);
    if (!e) continue;
    if (e.kind === "tooth") g.teethByZone.set(e.zone, [...(g.teethByZone.get(e.zone) ?? []), e.fdi]);
    else if (e.kind === "area") g.areas.set(e.zone, e.count);
    else if (e.kind === "edentulous") g.edentulous.add(e.arch);
    else if (e.kind === "denture") g.denture.add(e.arch);
    else g.unsure = true;
  }
  return g;
}

const archesLabel = (arches: Set<Arch>) =>
  arches.size === 2 ? "위아래" : arches.has("U") ? "위" : "아래";

const ZONE_ORDER: ZoneId[] = ["UR", "UF", "UL", "LL", "LF", "LR"];

export interface ToothLine {
  /** 이 줄을 지울 때 함께 지울 값들 */
  codes: string[];
  text: string;
}

/**
 * 사람이 읽는 줄 목록. withNumbers=true 면 의사용으로 FDI 번호를 붙인다.
 * 예) "아래 왼쪽 어금니 2개 (36, 37)", "위 왼쪽 어금니 2개 · 위치 미확인", "위 · 치아가 거의 없음"
 */
export function describeTeeth(codes: readonly string[], opts: { withNumbers?: boolean } = {}): ToothLine[] {
  const g = group(codes);
  const lines: ToothLine[] = [];

  for (const arch of ["U", "L"] as const) {
    if (g.edentulous.has(arch)) lines.push({ codes: [archCode("E", arch)], text: `${ARCH_LABEL[arch]} · 치아가 거의 없음` });
  }
  for (const zone of ZONE_ORDER) {
    const teeth = g.teethByZone.get(zone);
    if (teeth?.length) {
      const sorted = [...teeth].sort(sortFdi);
      lines.push({
        codes: sorted,
        text: `${ZONES[zone].label} ${sorted.length}개${opts.withNumbers ? ` (${sorted.join(", ")})` : ""}`,
      });
    }
    const area = g.areas.get(zone);
    if (area) {
      lines.push({
        codes: [areaCode(zone, area)],
        text: area === "all" ? `${ZONES[zone].label} 전부` : `${ZONES[zone].label} ${area}개 · 위치 미확인`,
      });
    }
  }
  for (const arch of ["U", "L"] as const) {
    if (g.denture.has(arch)) lines.push({ codes: [archCode("D", arch)], text: `${ARCH_LABEL[arch]} · 틀니 사용 중` });
  }
  if (g.unsure) lines.push({ codes: [UNSURE_CODE], text: "위치를 잘 모름 · 사진·상담으로 확인" });
  return lines;
}

/** 의사 화면 한 줄 표기 */
export function formatTeethForDentist(codes: readonly string[]): string {
  return describeTeeth(codes, { withNumbers: true }).map((l) => l.text).join(" · ") || "-";
}

/** 환자 화면 한 줄 표기 */
export function formatTeethForPatient(codes: readonly string[]): string {
  return describeTeeth(codes).map((l) => l.text).join(", ") || "-";
}

/** 목록 카드용 짧은 요약 — "치아 2개", "위 전체 · 치아 2개", "위 틀니", "위치 상담" */
export function toothSummary(codes: readonly string[]): string {
  const g = group(codes);
  let count = 0;
  for (const teeth of Array.from(g.teethByZone.values())) count += teeth.length;
  for (const [zone, area] of Array.from(g.areas.entries())) count += area === "all" ? zoneSize(zone) : area;

  const parts: string[] = [];
  if (g.edentulous.size > 0) parts.push(`${archesLabel(g.edentulous)} 전체`);
  if (count > 0) parts.push(`치아 ${count}개`);
  if (g.denture.size > 0) parts.push(`${archesLabel(g.denture)} 틀니`);
  if (parts.length === 0 && g.unsure) parts.push("위치 상담");
  return parts.join(" · ") || "치아 정보 없음";
}

/** 의사 견적서 임플란트 항목을 미리 채울 정확한 치아 번호만 */
export function exactTeeth(codes: readonly string[]): string[] {
  return codes.filter((c) => zoneOfTooth(c) !== null).sort(sortFdi);
}
