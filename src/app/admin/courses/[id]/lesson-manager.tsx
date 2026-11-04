"use client";

// 관리자: 강의 추가·수정·삭제

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface LessonRow {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  durationMin: number | null;
  displayOrder: number;
}

type Draft = Omit<LessonRow, "id">;

const EMPTY: Draft = { title: "", description: "", videoUrl: "", durationMin: null, displayOrder: 0 };

export function LessonManager({ courseId, lessons }: { courseId: string; lessons: LessonRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {lessons.length > 0 && (
        <ol className="divide-y rounded-lg border">
          {lessons.map((l, i) => (
            <li key={l.id} className="p-3">
              {editingId === l.id ? (
                <LessonForm
                  lessonId={l.id}
                  initial={l}
                  onDone={() => setEditingId(null)}
                  submitLabel="저장"
                />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="w-6 text-sm text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{l.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.videoUrl || "영상 없음"}
                      {l.durationMin ? ` · ${l.durationMin}분` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(l.id)}>
                    수정
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="rounded-lg border p-4">
        <p className="mb-3 font-semibold">강의 추가</p>
        <LessonForm
          courseId={courseId}
          initial={{ ...EMPTY, displayOrder: lessons.length }}
          submitLabel="추가"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        영상 주소: YouTube·Vimeo 주소 또는 mp4 주소. 비공개 영상은 S3 버킷에 올린 주소를 넣으면 서명 URL 로 재생됩니다.
        YouTube 일부 공개 영상은 주소를 아는 누구나 볼 수 있으니, 공개를 제한해야 하는 강의는 S3 또는 도메인 제한을 건 Vimeo를 쓰세요.
      </p>
    </div>
  );
}

function LessonForm({
  courseId,
  lessonId,
  initial,
  onDone,
  submitLabel,
}: {
  courseId?: string;
  lessonId?: string;
  initial: Draft;
  onDone?: () => void;
  submitLabel: string;
}) {
  const router = useRouter();
  const [v, setV] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        title: v.title,
        description: v.description,
        videoUrl: v.videoUrl,
        durationMin: v.durationMin ? Number(v.durationMin) : undefined,
        displayOrder: Number(v.displayOrder) || 0,
      };
      const res = await fetch(lessonId ? `/api/admin/lessons/${lessonId}` : `/api/admin/courses/${courseId}/lessons`, {
        method: lessonId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "저장에 실패했습니다");
        return;
      }
      if (!lessonId) setV({ ...EMPTY, displayOrder: (Number(v.displayOrder) || 0) + 1 });
      onDone?.();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!lessonId || !confirm("이 강의를 지울까요? 의사들의 이 강의 진도 기록도 함께 지워집니다.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, { method: "DELETE" });
      if (res.ok) {
        onDone?.();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label>강의 제목</Label>
        <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} required />
      </div>
      <div className="space-y-1">
        <Label>영상 주소</Label>
        <Input
          value={v.videoUrl}
          onChange={(e) => setV({ ...v, videoUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-1">
        <Label>설명 (선택)</Label>
        <Textarea rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>길이 (분)</Label>
          <Input
            type="number"
            min={1}
            value={v.durationMin ?? ""}
            onChange={(e) => setV({ ...v, durationMin: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div className="space-y-1">
          <Label>순서</Label>
          <Input
            type="number"
            min={0}
            value={v.displayOrder}
            onChange={(e) => setV({ ...v, displayOrder: Number(e.target.value) })}
          />
        </div>
      </div>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {submitLabel}
        </Button>
        {onDone && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onDone}>
            취소
          </Button>
        )}
        {lessonId && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onDelete} className="ml-auto text-destructive">
            삭제
          </Button>
        )}
      </div>
    </form>
  );
}
