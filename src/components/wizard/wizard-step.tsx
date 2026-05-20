"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WizardStepProps {
  /** 1-based 현재 단계 */
  current: number;
  total: number;
  /** 큰 제목 (질문 형식 권장) */
  title: string;
  /** 보조 설명 (선택) */
  description?: string;
  children: React.ReactNode;
  /** 다음 단계 가능 여부 */
  canNext: boolean;
  onPrev?: () => void;
  onNext: () => void;
  /** 마지막 단계에서 표시되는 다음 버튼 라벨 (기본: "다음") */
  nextLabel?: string;
  /** 건너뛰기 가능 (선택 단계) */
  onSkip?: () => void;
  /** 다음 버튼 처리 중 (loading) */
  loading?: boolean;
}

export function WizardStep({
  current,
  total,
  title,
  description,
  children,
  canNext,
  onPrev,
  onNext,
  nextLabel = "다음",
  onSkip,
  loading,
}: WizardStepProps) {
  const progress = (current / total) * 100;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* 진행 바 */}
      <div className="sticky top-0 z-10 border-b bg-background">
        <div className="container max-w-2xl py-3">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {current} / {total} 단계
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="container max-w-2xl flex-1 py-8">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            {description}
          </p>
        )}
        <div className="mt-8">{children}</div>
      </div>

      {/* 하단 고정 액션 */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur">
        <div className="container max-w-2xl py-4">
          <div className="flex items-center gap-3">
            {onPrev ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onPrev}
                disabled={loading}
                className={cn("h-14 flex-1 text-base font-semibold")}
              >
                <ChevronLeft className="mr-1 h-5 w-5" />
                이전
              </Button>
            ) : null}

            {onSkip ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={onSkip}
                disabled={loading}
                className="h-14 flex-1 text-base font-semibold"
              >
                건너뛰기
              </Button>
            ) : null}

            <Button
              type="button"
              size="lg"
              onClick={onNext}
              disabled={!canNext || loading}
              className={cn(
                "h-14 text-base font-semibold",
                onPrev || onSkip ? "flex-[2]" : "flex-1",
              )}
            >
              {loading ? "처리 중..." : nextLabel}
              {!loading && <ChevronRight className="ml-1 h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
