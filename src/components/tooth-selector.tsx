"use client";

// 치아 선택 — 50~70대도 고를 수 있게 "부위 먼저, 치아는 크게"
//  1) 입 모양 지도에서 부위(위·아래 × 왼쪽 어금니·앞니·오른쪽 어금니)를 누른다
//  2) 그 부위 치아만 크게 보고 빠진 치아를 누른다 — 헷갈리면 개수만 고른다
//  바로가기: 치아가 거의 없어요 / 틀니를 쓰고 있어요 / 잘 모르겠어요(사진·상담)
// 값 형식은 src/lib/teeth.ts 참고. 화면은 거울 보듯 오른쪽 = 환자 오른쪽.

import { useState } from "react";
import { ChevronLeft, Camera, Smile, SmilePlus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ZONES,
  ZONE_ROWS,
  ARCH_LABEL,
  UNSURE_CODE,
  areaCode,
  archCode,
  describeTeeth,
  parseToothEntry,
  toothName,
  zoneOfTooth,
  type Arch,
  type ZoneId,
} from "@/lib/teeth";

interface Props {
  value: string[];
  onChange: (selected: string[]) => void;
  /** 부위 확대 화면이 열리고 닫힐 때 (단계 제목을 줄이는 데 쓴다) */
  onZoneOpenChange?: (open: boolean) => void;
}

type AreaCount = 1 | 2 | 3 | "all";
const AREA_COUNTS: AreaCount[] = [1, 2, 3, "all"];
const ARCH_CHOICES: { key: string; arches: Arch[]; label: string }[] = [
  { key: "U", arches: ["U"], label: "위" },
  { key: "L", arches: ["L"], label: "아래" },
  { key: "UL", arches: ["U", "L"], label: "위아래" },
];

export function ToothSelector({ value, onChange, onZoneOpenChange }: Props) {
  const [openZone, setOpenZoneState] = useState<ZoneId | null>(null);
  const setOpenZone = (zone: ZoneId | null) => {
    setOpenZoneState(zone);
    onZoneOpenChange?.(zone !== null);
  };

  const entries = value.map((code) => ({ code, e: parseToothEntry(code) }));
  const archesOf = (kind: "edentulous" | "denture") =>
    new Set(entries.flatMap(({ e }) => (e && e.kind === kind ? [e.arch] : [])));
  const edentulous = archesOf("edentulous");
  const denture = archesOf("denture");
  const unsure = value.includes(UNSURE_CODE);

  const inZone = (code: string, zone: ZoneId) => {
    const e = parseToothEntry(code);
    return (e?.kind === "tooth" || e?.kind === "area") && e.zone === zone;
  };
  const inArch = (code: string, arch: Arch) => {
    const e = parseToothEntry(code);
    return (e?.kind === "tooth" || e?.kind === "area") && ZONES[e.zone].arch === arch;
  };

  const zoneTeeth = (zone: ZoneId) => value.filter((c) => zoneOfTooth(c) === zone);
  const zoneArea = (zone: ZoneId): AreaCount | null => {
    for (const { e } of entries) if (e?.kind === "area" && e.zone === zone) return e.count;
    return null;
  };

  /* ── 값 바꾸기 ─────────────────────────────── */
  function toggleTooth(fdi: string) {
    const zone = zoneOfTooth(fdi)!;
    const arch = ZONES[zone].arch;
    // 정확한 치아를 고르면 같은 부위의 "개수만" 값과 그 턱의 "치아가 거의 없음"은 뺀다
    const rest = value.filter(
      (c) => c !== fdi && !(c.startsWith("Z:") && inZone(c, zone)) && c !== archCode("E", arch),
    );
    onChange(value.includes(fdi) ? rest : [...rest, fdi]);
  }

  function setArea(zone: ZoneId, count: AreaCount) {
    const current = zoneArea(zone);
    const rest = value.filter((c) => !inZone(c, zone) && c !== archCode("E", ZONES[zone].arch));
    onChange(current === count ? rest : [...rest, areaCode(zone, count)]);
  }

  function setArches(kind: "E" | "D", arches: Arch[]) {
    const current = kind === "E" ? edentulous : denture;
    const same = current.size === arches.length && arches.every((a) => current.has(a));
    let rest = value.filter((c) => !c.startsWith(`${kind}:`));
    if (same) return onChange(rest);
    // 치아가 거의 없는 턱은 부위·치아 선택을 대신한다
    if (kind === "E") rest = rest.filter((c) => !arches.some((a) => inArch(c, a)));
    onChange([...rest, ...arches.map((a) => archCode(kind, a))]);
  }

  function toggleUnsure() {
    onChange(unsure ? value.filter((c) => c !== UNSURE_CODE) : [...value, UNSURE_CODE]);
  }

  function removeCodes(codes: string[]) {
    onChange(value.filter((c) => !codes.includes(c)));
  }

  function openZoneView(zone: ZoneId) {
    setOpenZone(zone);
    window.scrollTo({ top: 0 });
  }

  /* ── 부위 확대 화면 ─────────────────────────── */
  if (openZone) {
    return (
      <ZoneView
        zone={openZone}
        selected={zoneTeeth(openZone)}
        area={zoneArea(openZone)}
        onToggleTooth={toggleTooth}
        onSetArea={(count) => setArea(openZone, count)}
        onDone={() => setOpenZone(null)}
      />
    );
  }

  /* ── 입 모양 지도 ───────────────────────────── */
  const lines = describeTeeth(value);

  return (
    <div className="space-y-8">
      <div>
        <div className="rounded-2xl border-2 bg-muted/20 p-3">
          {(["U", "L"] as const).map((arch, i) => (
            <div key={arch}>
              {i === 1 && <div className="my-3 border-t border-dashed" />}
              {arch === "U" && <p className="mb-2 text-center text-sm text-muted-foreground">위쪽</p>}
              {edentulous.has(arch) ? (
                <button
                  type="button"
                  onClick={() => setArches("E", Array.from(edentulous).filter((a) => a !== arch))}
                  className="flex min-h-[76px] w-full items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary/10 text-lg font-semibold text-primary"
                >
                  {ARCH_LABEL[arch]} · 치아가 거의 없음
                  <span className="text-sm font-normal underline">해제</span>
                </button>
              ) : (
                <div className="grid grid-cols-[1fr_0.9fr_1fr] gap-2">
                  {ZONE_ROWS[arch].map((zone) => {
                    const n = zoneTeeth(zone).length;
                    const area = zoneArea(zone);
                    const badge = n > 0 ? `${n}개 선택` : area ? (area === "all" ? "전부" : `${area}개`) : null;
                    return (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => openZoneView(zone)}
                        aria-label={`${ZONES[zone].label}${badge ? ` — ${badge}` : ""}`}
                        className={cn(
                          "flex min-h-[76px] flex-col items-center justify-center rounded-xl border-2 px-1 py-2 text-lg font-semibold leading-tight transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          badge
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input bg-background hover:border-primary/50",
                        )}
                      >
                        <span className="whitespace-pre-line text-center">{ZONES[zone].short}</span>
                        {badge && <span className="mt-1 text-sm font-medium">{badge}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              {arch === "L" && <p className="mt-2 text-center text-sm text-muted-foreground">아래쪽</p>}
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          거울을 볼 때처럼, 화면 오른쪽이 내 오른쪽이에요
        </p>
      </div>

      <div>
        <p className="mb-3 text-base font-semibold">이런 경우라면 여기를 눌러 주세요</p>
        <div className="space-y-3">
          <ArchShortcut
            icon={<Smile className="h-6 w-6" aria-hidden />}
            label="치아가 거의 없어요"
            selected={edentulous}
            onPick={(arches) => setArches("E", arches)}
          />
          <ArchShortcut
            icon={<SmilePlus className="h-6 w-6" aria-hidden />}
            label="틀니를 쓰고 있어요"
            selected={denture}
            onPick={(arches) => setArches("D", arches)}
          />
          <button
            type="button"
            role="checkbox"
            aria-checked={unsure}
            onClick={toggleUnsure}
            className={cn(
              "flex min-h-[64px] w-full items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-colors",
              unsure ? "border-primary bg-primary/10" : "border-input bg-background hover:border-primary/50",
            )}
          >
            <Camera className={cn("h-6 w-6 shrink-0", unsure && "text-primary")} aria-hidden />
            <span>
              <span className="block text-lg font-semibold">어디인지 잘 모르겠어요</span>
              {unsure && (
                <span className="mt-1 block text-sm text-muted-foreground">
                  다음 단계에서 입 안 사진을 올려 주시면 원장님이 보고 판단해요
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {lines.length > 0 && (
        <div className="rounded-xl bg-primary/10 p-4">
          <p className="mb-2 text-base font-semibold text-primary">고른 내용</p>
          <ul className="space-y-2">
            {lines.map((l) => (
              <li key={l.codes.join(",")} className="flex items-center justify-between gap-3 text-base">
                <span>{l.text}</span>
                <button
                  type="button"
                  onClick={() => removeCodes(l.codes)}
                  aria-label={`${l.text} 지우기`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── 바로가기: 위 / 아래 / 위아래 ─────────────── */
function ArchShortcut({
  icon,
  label,
  selected,
  onPick,
}: {
  icon: React.ReactNode;
  label: string;
  selected: Set<Arch>;
  onPick: (arches: Arch[]) => void;
}) {
  const [open, setOpen] = useState(selected.size > 0);
  const active = selected.size > 0;
  const isChoice = (arches: Arch[]) => selected.size === arches.length && arches.every((a) => selected.has(a));

  return (
    <div className={cn("rounded-xl border-2 transition-colors", active ? "border-primary bg-primary/10" : "border-input bg-background")}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[64px] w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className={cn("shrink-0", active && "text-primary")}>{icon}</span>
        <span className="text-lg font-semibold">{label}</span>
      </button>
      {open && (
        <div className="grid grid-cols-3 gap-2 px-4 pb-4">
          {ARCH_CHOICES.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={isChoice(c.arches)}
              onClick={() => onPick(c.arches)}
              className={cn(
                "h-12 rounded-lg border-2 text-lg font-semibold",
                isChoice(c.arches) ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 부위 확대 ─────────────────────────────── */
// 줄 폭을 꽉 채우되 어금니는 앞니보다 넓게 (폰 폭 375 에서 앞니 약 44px, 어금니 약 70px)
const TOOTH_GROW: Record<string, number> = {
  "1": 0.9, "2": 0.85, "3": 0.95,
  "4": 1, "5": 1,
  "6": 1.25, "7": 1.2,
  "8": 1.05,
};

function ZoneView({
  zone: zoneId,
  selected,
  area,
  onToggleTooth,
  onSetArea,
  onDone,
}: {
  zone: ZoneId;
  selected: string[];
  area: AreaCount | null;
  onToggleTooth: (fdi: string) => void;
  onSetArea: (count: AreaCount) => void;
  onDone: () => void;
}) {
  const zone = ZONES[zoneId];
  const [showWisdom, setShowWisdom] = useState(Boolean(zone.wisdom && selected.includes(zone.wisdom)));
  const upper = zone.arch === "U";

  const teeth = [...zone.teeth];
  if (zone.wisdom && showWisdom) {
    if (zone.wisdomAt === "start") teeth.unshift(zone.wisdom);
    else teeth.push(zone.wisdom);
  }

  // 줄 양 끝 안내 — 화면 왼쪽 어금니는 바깥(왼쪽)이 안쪽, 오른쪽 어금니는 반대
  const ends =
    zoneId === "UF" || zoneId === "LF"
      ? ["왼쪽", "오른쪽"]
      : zoneId === "UL" || zoneId === "LL"
        ? ["안쪽", "앞니 쪽"]
        : ["앞니 쪽", "안쪽"];

  const gum = <div className="h-3 rounded-full bg-rose-200 dark:bg-rose-900/60" aria-hidden />;

  return (
    <div>
      <button
        type="button"
        onClick={onDone}
        className="flex items-center gap-1 text-base text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden /> 부위 다시 고르기
      </button>
      <h2 className="mt-4 text-2xl font-bold">{zone.label}</h2>
      <p className="mt-1 text-base text-muted-foreground">빠졌거나 뽑아야 하는 치아를 눌러 주세요.</p>

      <div className="mt-6 rounded-2xl border-2 bg-muted/20 px-2 py-4">
        {upper && gum}
        <div className={cn("flex justify-center gap-1.5 px-1", upper ? "items-start" : "items-end")}>
          {teeth.map((t) => {
            const on = selected.includes(t);
            const wisdom = t === zone.wisdom;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                aria-label={`${toothName(t)} (${t}번)`}
                onClick={() => onToggleTooth(t)}
                style={{ flexGrow: TOOTH_GROW[t[1]] }}
                className={cn(
                  "flex items-center justify-center border-2 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "min-w-[40px] max-w-[80px] basis-0",
                  Number(t[1]) >= 4 ? "h-[84px]" : "h-[92px]",
                  upper ? "-mt-1 rounded-b-[20px] rounded-t-md" : "-mb-1 rounded-t-[20px] rounded-b-md",
                  wisdom && !on && "border-dashed",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:border-primary/50",
                )}
              >
                {on && <X className="h-7 w-7" aria-hidden />}
              </button>
            );
          })}
        </div>
        {!upper && gum}
        <div className="mt-2 flex justify-between px-1 text-sm text-muted-foreground">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      </div>

      {zone.wisdom && (
        <button
          type="button"
          onClick={() => setShowWisdom((v) => !v)}
          className="mt-3 text-base text-muted-foreground underline underline-offset-4"
        >
          {showWisdom ? "사랑니 자리 숨기기" : "사랑니 자리도 보기"}
        </button>
      )}

      <div className="mt-6 border-t pt-5">
        <p className="break-keep text-base font-semibold">어느 치아인지 헷갈리면 개수만 골라 주세요</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {AREA_COUNTS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={area === c}
              onClick={() => onSetArea(c)}
              className={cn(
                "h-14 rounded-xl border-2 text-lg font-semibold transition-colors",
                area === c ? "border-primary bg-primary/10 text-primary" : "border-input bg-background hover:border-primary/50",
              )}
            >
              {c === "all" ? "전부" : `${c}개`}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-8 h-14 w-full rounded-xl border-2 border-primary text-lg font-semibold text-primary hover:bg-primary/10"
      >
        이 부위 다 골랐어요
      </button>
    </div>
  );
}
