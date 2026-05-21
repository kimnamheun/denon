"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface StartChatButtonProps {
  /** 견적서 ID (가장 권장 — 정확한 환자/의사 매칭) */
  quotationId?: string;
  /** 또는 (견적 요청 ID + 의사 ID) */
  quotationRequestId?: string;
  dentistId?: string;
  /** 진입 경로: "/patient/chat" 또는 "/dentist/chat" */
  basePath: "/patient/chat" | "/dentist/chat";
  label?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export function StartChatButton({
  quotationId,
  quotationRequestId,
  dentistId,
  basePath,
  label = "문의하기",
  size = "default",
  variant = "default",
}: StartChatButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotationId, quotationRequestId, dentistId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message ?? d.error ?? "채팅방 생성 실패");
        return;
      }
      const room = await res.json();
      router.push(`${basePath}/${room.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-stretch">
      <Button
        type="button"
        onClick={onClick}
        disabled={loading}
        size={size}
        variant={variant}
      >
        <MessageCircle className="h-5 w-5 mr-2" />
        {loading ? "준비 중..." : label}
      </Button>
      {error && (
        <span className="mt-1 text-sm text-destructive">{error}</span>
      )}
    </div>
  );
}
