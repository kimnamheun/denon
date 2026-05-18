"use client";

// 32개 영구치 선택 UI (FDI 표기법)
// 상악 우측 → 좌측 → 하악 좌측 → 우측 순으로 배열 (구강 정면 기준)
//
// FDI 분면 번호:
//   18 17 16 15 14 13 12 11 | 21 22 23 24 25 26 27 28   (상악)
//   48 47 46 45 44 43 42 41 | 31 32 33 34 35 36 37 38   (하악)

import { cn } from "@/lib/utils";

const UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
const UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
const LOWER_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"];
const LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];

interface Props {
  value: string[];
  onChange: (selected: string[]) => void;
}

export function ToothSelector({ value, onChange }: Props) {
  const toggle = (t: string) => {
    onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  };

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground flex justify-between mb-2">
        <span>오른쪽</span>
        <span className="font-semibold">치아를 클릭하여 선택</span>
        <span>왼쪽</span>
      </div>

      {/* 상악 (위쪽 잇몸) */}
      <div className="flex gap-1 justify-center">
        {UPPER_RIGHT.map((t) => (
          <Tooth key={t} number={t} selected={value.includes(t)} onClick={() => toggle(t)} />
        ))}
        <div className="w-2" /> {/* 정중선 갭 */}
        {UPPER_LEFT.map((t) => (
          <Tooth key={t} number={t} selected={value.includes(t)} onClick={() => toggle(t)} />
        ))}
      </div>

      <div className="border-t border-dashed my-2" />

      {/* 하악 (아래쪽 잇몸) */}
      <div className="flex gap-1 justify-center">
        {LOWER_RIGHT.map((t) => (
          <Tooth key={t} number={t} selected={value.includes(t)} onClick={() => toggle(t)} />
        ))}
        <div className="w-2" />
        {LOWER_LEFT.map((t) => (
          <Tooth key={t} number={t} selected={value.includes(t)} onClick={() => toggle(t)} />
        ))}
      </div>

      {value.length > 0 && (
        <div className="mt-3 text-sm text-muted-foreground text-center">
          선택된 치아: <span className="font-medium text-foreground">{value.sort().join(", ")}</span>
        </div>
      )}
    </div>
  );
}

function Tooth({
  number,
  selected,
  onClick,
}: {
  number: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-7 h-9 sm:w-8 sm:h-10 rounded text-[10px] sm:text-xs font-medium border transition-colors",
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted border-input",
      )}
      aria-pressed={selected}
      aria-label={`치아 ${number}`}
    >
      {number}
    </button>
  );
}
