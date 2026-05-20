"use client";

import { Check, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BigOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  popular?: boolean;
}

interface BigToggleSingleProps<T extends string> {
  options: ReadonlyArray<BigOption<T>>;
  value: T | null;
  onChange: (value: T) => void;
  multi?: false;
  className?: string;
}

interface BigToggleMultiProps<T extends string> {
  options: ReadonlyArray<BigOption<T>>;
  value: T[];
  onChange: (value: T[]) => void;
  multi: true;
  className?: string;
}

type Props<T extends string> = BigToggleSingleProps<T> | BigToggleMultiProps<T>;

export function BigToggleGroup<T extends string>(props: Props<T>) {
  const { options, className } = props;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {options.map((opt) => {
        const selected = props.multi
          ? props.value.includes(opt.value)
          : props.value === opt.value;

        return (
          <button
            key={opt.value}
            type="button"
            role={props.multi ? "checkbox" : "radio"}
            aria-checked={selected}
            onClick={() => {
              if (props.multi) {
                const next = selected
                  ? props.value.filter((v) => v !== opt.value)
                  : [...props.value, opt.value];
                props.onChange(next);
              } else {
                props.onChange(opt.value);
              }
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-all",
              "min-h-[64px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-input bg-background hover:border-primary/50 hover:bg-muted/50",
            )}
          >
            {/* 좌측 체크박스/라디오 표시 */}
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/40 bg-background",
              )}
              aria-hidden="true"
            >
              {selected && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>

            {/* 라벨 + 설명 */}
            <span className="flex flex-1 flex-col">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-lg font-semibold leading-snug",
                    selected ? "text-foreground" : "text-foreground",
                  )}
                >
                  {opt.label}
                </span>
                {opt.popular && (
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
                      "bg-amber-100 text-amber-800",
                    )}
                  >
                    <Crown className="h-3 w-3" />
                    많이 선택
                  </span>
                )}
              </span>
              {opt.description && (
                <span className="mt-0.5 text-sm text-muted-foreground">
                  {opt.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
