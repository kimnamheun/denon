"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface ToggleGroupSingleProps<T extends string> {
  options: ReadonlyArray<ToggleOption<T>>;
  value: T | null;
  onChange: (value: T | null) => void;
  multi?: false;
  clearable?: boolean; // 같은 버튼 재클릭 시 null 로 (전체 해제)
  size?: "sm" | "default";
  className?: string;
}

interface ToggleGroupMultiProps<T extends string> {
  options: ReadonlyArray<ToggleOption<T>>;
  value: T[];
  onChange: (value: T[]) => void;
  multi: true;
  size?: "sm" | "default";
  className?: string;
}

type Props<T extends string> = ToggleGroupSingleProps<T> | ToggleGroupMultiProps<T>;

export function ToggleGroup<T extends string>(props: Props<T>) {
  const { options, size = "default", className } = props;

  const sizeClass =
    size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm";

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((opt) => {
        const selected = props.multi
          ? props.value.includes(opt.value)
          : props.value === opt.value;

        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              if (props.multi) {
                const next = selected
                  ? props.value.filter((v) => v !== opt.value)
                  : [...props.value, opt.value];
                props.onChange(next);
              } else {
                const next =
                  selected && props.clearable ? null : opt.value;
                props.onChange(next);
              }
            }}
            className={cn(
              "rounded-md border font-medium transition-colors whitespace-nowrap",
              sizeClass,
              selected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-input",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
