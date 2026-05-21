"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: "PATIENT" | "DENTIST" | "ADMIN";
  content: string;
  readAt: string | null;
  createdAt: string;
}

interface ChatRoomData {
  roomId: string;
  myRole: "PATIENT" | "DENTIST" | "ADMIN";
  messages: ChatMessage[];
}

interface ChatRoomProps {
  roomId: string;
  /** 상대방 표시명 (헤더용) */
  counterpartName: string;
  /** 상대방 부가 정보 (예: 병원명, 환자 정보) */
  counterpartSub?: string;
}

const POLL_INTERVAL_MS = 5000;

export function ChatRoom({ roomId, counterpartName, counterpartSub }: ChatRoomProps) {
  const [data, setData] = useState<ChatRoomData | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  // 메시지 폴링
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch(`/api/chat/rooms/${roomId}/messages`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: ChatRoomData | null) => {
          if (cancelled || !d) return;
          setData(d);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId]);

  // 새 메시지 도착하면 맨 아래로 스크롤
  useEffect(() => {
    if (!listRef.current || !data) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [data?.messages.length, data]);

  async function onSend() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message ?? d.error ?? "메시지 전송 실패");
        return;
      }
      setInput("");
      // 즉시 polling 새로고침
      const fresh = await fetch(`/api/chat/rooms/${roomId}/messages`).then((r) => r.json());
      setData(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "전송 오류");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter 로 전송, Shift+Enter 로 줄바꿈
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSend();
    }
  }

  if (!data) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-base text-muted-foreground">
        대화를 불러오는 중...
      </div>
    );
  }

  const myRole = data.myRole;

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col rounded-xl border-2 bg-card">
      {/* 헤더 */}
      <div className="border-b p-4">
        <div className="text-lg font-bold">{counterpartName}</div>
        {counterpartSub && (
          <div className="text-sm text-muted-foreground mt-0.5">{counterpartSub}</div>
        )}
      </div>

      {/* 의료법 면책 안내 (한 번만 표시) */}
      <div className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-900 leading-relaxed">
        💡 본 채팅은 <strong>일반 상담 문의</strong> 용도입니다.
        정확한 진단·치료는 직접 내원 후 의료진과 상담하시기 바랍니다.
      </div>

      {/* 메시지 리스트 */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {data.messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-base text-muted-foreground">
            아직 대화가 없어요. 첫 메시지를 보내보세요.
          </div>
        )}
        {data.messages.map((m) => {
          const isMine = m.senderRole === myRole;
          return (
            <div
              key={m.id}
              className={cn("flex", isMine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-3 text-base leading-relaxed whitespace-pre-wrap break-words",
                  isMine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                <div>{m.content}</div>
                <div
                  className={cn(
                    "mt-1 text-xs",
                    isMine ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {new Date(m.createdAt).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isMine && m.readAt && " · 읽음"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 입력 영역 */}
      <div className="border-t p-3">
        {error && (
          <div className="mb-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {error}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="메시지를 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
            rows={2}
            maxLength={2000}
            className="flex-1 resize-none rounded-lg border-2 border-input bg-background px-4 py-2 text-base leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={sending}
          />
          <Button
            type="button"
            size="lg"
            onClick={onSend}
            disabled={sending || !input.trim()}
            aria-label="메시지 전송"
            className="h-14 px-5"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-1 text-right text-xs text-muted-foreground">
          {input.length} / 2000
        </div>
      </div>
    </div>
  );
}
