import { describe, it, expect } from "vitest";

import {
  ZONES,
  describeTeeth,
  exactTeeth,
  formatTeethForDentist,
  formatTeethForPatient,
  isValidToothEntry,
  parseToothEntry,
  toothName,
  toothSummary,
  zoneOfTooth,
} from "../teeth";
import { quotationRequestSchema } from "../zod-schemas";

describe("치아 값 해석", () => {
  it("영구치 32개(사랑니 포함)는 모두 한 부위에 속한다", () => {
    const all = [1, 2, 3, 4].flatMap((q) => [1, 2, 3, 4, 5, 6, 7, 8].map((p) => `${q}${p}`));
    expect(all.every((t) => zoneOfTooth(t) !== null)).toBe(true);
    const shown = Object.values(ZONES).flatMap((z) => z.teeth);
    expect(new Set(shown).size).toBe(28); // 기본 화면은 사랑니 제외
  });

  it("허용 형식만 통과", () => {
    for (const ok of ["36", "18", "Z:LL:2", "Z:UF:A", "E:U", "D:L", "P"]) expect(isValidToothEntry(ok)).toBe(true);
    for (const bad of ["19", "50", "Z:XX:2", "Z:LL:4", "E:X", "", "36 ", "<b>"]) expect(isValidToothEntry(bad)).toBe(false);
  });

  it("부위·개수 해석", () => {
    expect(parseToothEntry("Z:UR:3")).toEqual({ kind: "area", zone: "UR", count: 3 });
    expect(parseToothEntry("Z:LF:A")).toEqual({ kind: "area", zone: "LF", count: "all" });
    expect(parseToothEntry("36")).toEqual({ kind: "tooth", fdi: "36", zone: "LL" });
  });

  it("치아 이름은 환자 기준 좌우", () => {
    expect(toothName("36")).toBe("아래 왼쪽 첫째 큰어금니");
    expect(toothName("11")).toBe("위 오른쪽 가운데 앞니");
  });
});

describe("표시", () => {
  const codes = ["37", "36", "Z:UL:2", "E:L", "D:U", "P"];

  it("목록 요약", () => {
    expect(toothSummary(["36", "37"])).toBe("치아 2개");
    expect(toothSummary(["Z:UF:A"])).toBe("치아 6개");
    expect(toothSummary(codes)).toBe("아래 전체 · 치아 4개 · 위 틀니");
    expect(toothSummary(["P"])).toBe("위치 상담");
    expect(toothSummary([])).toBe("치아 정보 없음");
  });

  it("의사 화면엔 번호, 환자 화면엔 말로", () => {
    expect(formatTeethForDentist(["37", "36"])).toBe("아래 왼쪽 어금니 2개 (36, 37)");
    expect(formatTeethForPatient(["37", "36"])).toBe("아래 왼쪽 어금니 2개");
    expect(formatTeethForPatient(["Z:UL:2"])).toBe("위 왼쪽 어금니 2개 · 위치 미확인");
    expect(formatTeethForDentist([])).toBe("-");
  });

  it("줄마다 지울 값을 함께 준다", () => {
    const lines = describeTeeth(codes);
    expect(lines.map((l) => l.text)).toEqual([
      "아래 · 이가 거의 없음",
      "위 왼쪽 어금니 2개 · 위치 미확인",
      "아래 왼쪽 어금니 2개",
      "위 · 틀니 사용 중",
      "위치를 잘 모름 · 사진·상담으로 확인",
    ]);
    expect(lines[2].codes).toEqual(["36", "37"]);
  });

  it("견적서 미리 채우기는 정확한 번호만", () => {
    expect(exactTeeth(codes)).toEqual(["36", "37"]);
  });
});

describe("견적 요청 검증", () => {
  const base = { symptoms: "통증", urgency: "MEDIUM" as const };

  it("부위·바로가기 값을 받고 중복은 하나로", () => {
    const r = quotationRequestSchema.safeParse({ ...base, missingTeeth: ["36", "36", "Z:UL:2", "P"] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.missingTeeth).toEqual(["36", "Z:UL:2", "P"]);
  });

  it("모르는 값은 거부", () => {
    expect(quotationRequestSchema.safeParse({ ...base, missingTeeth: ["99"] }).success).toBe(false);
  });

  it("수정(PATCH)용 partial 에서도 같은 검증", () => {
    expect(quotationRequestSchema.partial().safeParse({ missingTeeth: ["Z:LL:9"] }).success).toBe(false);
    expect(quotationRequestSchema.partial().safeParse({}).success).toBe(true);
  });
});
