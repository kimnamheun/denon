"use client";

// 관리자: 술식 과정 등록·수정 폼

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TREATMENT_PLAN_TAGS } from "@/lib/constants/quotation-form-options";

export interface CourseFormValue {
  title: string;
  summary: string;
  procedureTags: string[];
  level: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  instructor: string;
  displayOrder: number;
  isPublished: boolean;
}

const EMPTY: CourseFormValue = {
  title: "",
  summary: "",
  procedureTags: [],
  level: "BASIC",
  instructor: "",
  displayOrder: 0,
  isPublished: false,
};

const LEVELS: { value: CourseFormValue["level"]; label: string }[] = [
  { value: "BASIC", label: "기초" },
  { value: "INTERMEDIATE", label: "중급" },
  { value: "ADVANCED", label: "고급" },
];

export function CourseForm({ courseId, initial }: { courseId?: string; initial?: CourseFormValue }) {
  const router = useRouter();
  const [v, setV] = useState<CourseFormValue>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof CourseFormValue>(k: K, val: CourseFormValue[K]) => {
    setSaved(false);
    setV((prev) => ({ ...prev, [k]: val }));
  };

  function toggleTag(tag: string) {
    set(
      "procedureTags",
      v.procedureTags.includes(tag) ? v.procedureTags.filter((t) => t !== tag) : [...v.procedureTags, tag],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(courseId ? `/api/admin/courses/${courseId}` : "/api/admin/courses", {
        method: courseId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, displayOrder: Number(v.displayOrder) || 0 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "저장에 실패했습니다");
        return;
      }
      if (courseId) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/admin/courses/${data.id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!courseId || !confirm("이 과정을 숨길까요? 이미 생긴 이수 이력은 남습니다.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, { method: "DELETE" });
      if (res.ok) router.push("/admin/courses");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="c-title">과정명</Label>
        <Input id="c-title" value={v.title} onChange={(e) => set("title", e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-summary">과정 소개</Label>
        <Textarea id="c-summary" rows={4} value={v.summary} onChange={(e) => set("summary", e.target.value)} required />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">연결 술식 (견적서 시술 태그와 같음)</p>
        <div className="flex flex-wrap gap-2">
          {TREATMENT_PLAN_TAGS.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => toggleTag(t.value)}
              className={cn(
                "h-9 rounded-full border px-3 text-sm",
                v.procedureTags.includes(t.value) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">난이도</p>
          <div className="flex gap-1">
            {LEVELS.map((l) => (
              <button
                type="button"
                key={l.value}
                onClick={() => set("level", l.value)}
                className={cn(
                  "h-9 flex-1 rounded-md border text-sm",
                  v.level === l.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-instructor">강사 (선택)</Label>
          <Input id="c-instructor" value={v.instructor} onChange={(e) => set("instructor", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-order">표시 순서</Label>
          <Input
            id="c-order"
            type="number"
            min={0}
            value={v.displayOrder}
            onChange={(e) => set("displayOrder", Number(e.target.value))}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.isPublished} onChange={(e) => set("isPublished", e.target.checked)} className="h-4 w-4" />
        의사에게 공개
      </label>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">저장했습니다.</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {courseId ? "저장" : "과정 만들기"}
        </Button>
        {courseId && (
          <Button type="button" variant="outline" disabled={busy} onClick={onDelete}>
            과정 숨기기
          </Button>
        )}
      </div>
    </form>
  );
}
