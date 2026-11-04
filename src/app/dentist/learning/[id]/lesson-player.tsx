"use client";

// 강의 영상 재생 + "다 봤어요" 완료 처리

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, GraduationCap, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LessonVideo } from "@/lib/learning";

export interface PlayerLesson {
  id: string;
  title: string;
  description: string | null;
  durationMin: number | null;
  video: LessonVideo | null;
  done: boolean;
}

export function LessonPlayer({
  lessons: initial,
  alreadyCompleted,
}: {
  lessons: PlayerLesson[];
  alreadyCompleted: boolean;
}) {
  const [lessons, setLessons] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(
    () => (initial.find((l) => !l.done) ?? initial[0])?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);

  const active = lessons.find((l) => l.id === activeId) ?? null;
  const doneCount = lessons.filter((l) => l.done).length;

  if (lessons.length === 0) {
    return (
      <p className="rounded-lg bg-muted/50 p-6 text-center text-base text-muted-foreground">
        강의가 준비 중입니다.
      </p>
    );
  }

  async function markDone(lessonId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/learning/lessons/${lessonId}/complete`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "완료 처리에 실패했습니다");
        return;
      }
      const next = lessons.map((l) => (l.id === lessonId ? { ...l, done: true } : l));
      setLessons(next);
      if (data.newlyCompleted) setJustCompleted(true);
      // 다음 안 본 강의로 이동
      const nextLesson = next.find((l) => !l.done);
      if (nextLesson) setActiveId(nextLesson.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {(justCompleted || (alreadyCompleted && doneCount === lessons.length)) && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <GraduationCap className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div className="text-base">
            <p className="font-bold">과정을 모두 마쳤습니다</p>
            <p className="text-muted-foreground">
              교육 이수 이력에 올라가 환자 견적 비교 화면에 표시됩니다.{" "}
              <Link href="/dentist/credentials" className="text-blue-600 underline">
                이수 이력 보기
              </Link>
            </p>
          </div>
        </div>
      )}

      {active && (
        <div className="space-y-3">
          <VideoBox video={active.video} title={active.title} />
          <div>
            <p className="text-lg font-bold">{active.title}</p>
            {active.description && (
              <p className="mt-1 whitespace-pre-wrap text-base text-muted-foreground">{active.description}</p>
            )}
          </div>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-base text-destructive">{error}</p>}
          {active.done ? (
            <p className="flex items-center gap-2 text-base font-medium text-emerald-700">
              <CheckCircle2 className="h-5 w-5" /> 완료한 강의입니다
            </p>
          ) : (
            <Button className="h-12 w-full text-lg" disabled={busy} onClick={() => markDone(active.id)}>
              {busy ? "처리 중..." : "이 강의 다 봤어요"}
            </Button>
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-base font-semibold">
          강의 목록 <span className="font-normal text-muted-foreground">({doneCount}/{lessons.length})</span>
        </p>
        <ol className="divide-y rounded-lg border">
          {lessons.map((l, i) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => setActiveId(l.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left text-base hover:bg-muted",
                  l.id === activeId && "bg-muted",
                )}
              >
                {l.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : l.id === activeId ? (
                  <PlayCircle className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1">
                  {i + 1}. {l.title}
                </span>
                {l.durationMin && <span className="shrink-0 text-sm text-muted-foreground">{l.durationMin}분</span>}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function VideoBox({ video, title }: { video: LessonVideo | null; title: string }) {
  if (!video) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-base text-muted-foreground">
        영상 준비 중
      </div>
    );
  }
  if (video.kind === "embed") {
    return (
      <iframe
        src={video.src}
        title={title}
        className="aspect-video w-full rounded-lg bg-black"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video src={video.src} controls playsInline controlsList="nodownload" className="aspect-video w-full rounded-lg bg-black" />
  );
}
