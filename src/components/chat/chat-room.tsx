"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, MoreHorizontal, Pin, PinOff, Search, Send, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/lib/upload";

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: "PATIENT" | "DENTIST" | "ADMIN";
  content: string;
  imageUrl: string | null;
  readAt: string | null;
  pinnedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

interface ChatRoomData {
  roomId: string;
  myRole: "PATIENT" | "DENTIST" | "ADMIN";
  messages: ChatMessage[];
  otherTyping?: boolean;
}

interface ChatRoomProps {
  roomId: string;
  counterpartName: string;
  counterpartSub?: string;
}

const POLL_INTERVAL_MS = 2000;        // 2초로 단축 (체감 실시간)
const TYPING_PING_DEBOUNCE_MS = 1500; // 입력 후 1.5초 한 번씩만 ping

export function ChatRoom({ roomId, counterpartName, counterpartSub }: ChatRoomProps) {
  const [data, setData] = useState<ChatRoomData | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastTypingPingRef = useRef<number>(0);

  /* ── 메시지 폴링 ────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (searchQ.trim()) params.set("q", searchQ.trim());
    if (showPinnedOnly) params.set("pinnedOnly", "true");
    const qs = params.toString() ? `?${params.toString()}` : "";

    const load = () => {
      fetch(`/api/chat/rooms/${roomId}/messages${qs}`)
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
  }, [roomId, searchQ, showPinnedOnly]);

  /* ── 새 메시지 도착 시 맨 아래 스크롤 ─────────────── */
  useEffect(() => {
    if (!listRef.current || !data) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [data?.messages.length, data?.otherTyping, data]);

  /* ── 타이핑 ping (디바운스) ───────────────────────── */
  function pingTyping() {
    const now = Date.now();
    if (now - lastTypingPingRef.current < TYPING_PING_DEBOUNCE_MS) return;
    lastTypingPingRef.current = now;
    fetch(`/api/chat/rooms/${roomId}/typing`, { method: "POST" }).catch(() => {});
  }

  /* ── 사진 업로드 ──────────────────────────────────── */
  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setError(null);
    try {
      const { publicUrl } = await uploadFile(f);
      setPendingImage(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진 업로드 실패");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /* ── 메시지 전송 ──────────────────────────────────── */
  async function onSend() {
    const content = input.trim();
    if ((!content && !pendingImage) || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, imageUrl: pendingImage }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message ?? d.error ?? "메시지 전송 실패");
        return;
      }
      setInput("");
      setPendingImage(null);
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSend();
    } else {
      pingTyping();
    }
  }

  /* ── 메시지 액션 (핀/삭제) ────────────────────────── */
  async function togglePin(m: ChatMessage) {
    setMenuOpenId(null);
    await fetch(`/api/chat/messages/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: m.pinnedAt ? "unpin" : "pin" }),
    });
    // 즉시 새로고침
    const fresh = await fetch(`/api/chat/rooms/${roomId}/messages`).then((r) => r.json());
    setData(fresh);
  }

  async function deleteMessage(m: ChatMessage) {
    setMenuOpenId(null);
    if (!confirm("이 메시지를 삭제할까요?")) return;
    await fetch(`/api/chat/messages/${m.id}`, { method: "DELETE" });
    const fresh = await fetch(`/api/chat/rooms/${roomId}/messages`).then((r) => r.json());
    setData(fresh);
  }

  /* ── 렌더 ─────────────────────────────────────────── */
  const myRole = data?.myRole;
  const showingSpecial = useMemo(
    () => !!(searchQ.trim() || showPinnedOnly),
    [searchQ, showPinnedOnly],
  );

  if (!data) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-base text-muted-foreground">
        대화를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col rounded-xl border-2 bg-card">
      {/* 헤더 */}
      <div className="border-b p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold truncate">{counterpartName}</div>
          {counterpartSub && (
            <div className="text-sm text-muted-foreground mt-0.5 truncate">{counterpartSub}</div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant={showPinnedOnly ? "default" : "ghost"}
            size="icon"
            onClick={() => {
              setShowPinnedOnly((v) => !v);
              setSearchQ("");
              setSearchOpen(false);
            }}
            aria-label="고정 메시지만 보기"
            title="고정 메시지만 보기"
            className="h-10 w-10"
          >
            <Pin className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant={searchOpen ? "default" : "ghost"}
            size="icon"
            onClick={() => {
              setSearchOpen((v) => !v);
              if (searchOpen) setSearchQ("");
              setShowPinnedOnly(false);
            }}
            aria-label="검색"
            className="h-10 w-10"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 검색 입력 */}
      {searchOpen && (
        <div className="border-b p-3">
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="메시지에서 검색..."
            className="w-full h-11 px-4 rounded-lg border-2 border-input bg-background text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
          />
        </div>
      )}

      {/* 의료법 면책 안내 */}
      {!showingSpecial && (
        <div className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-900 leading-relaxed">
          💡 본 채팅은 <strong>일반 상담 문의</strong> 용도입니다.
          정확한 진단·치료는 직접 내원 후 의료진과 상담하시기 바랍니다.
        </div>
      )}

      {/* 메시지 리스트 */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {data.messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-base text-muted-foreground text-center px-4">
            {showingSpecial
              ? "조건에 맞는 메시지가 없어요."
              : "아직 대화가 없어요. 첫 메시지를 보내보세요."}
          </div>
        )}
        {data.messages.map((m) => {
          const isMine = m.senderRole === myRole;
          const isDeleted = !!m.deletedAt;
          const isPinned = !!m.pinnedAt;
          return (
            <div
              key={m.id}
              className={cn("group flex", isMine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "relative max-w-[75%] rounded-2xl px-4 py-3 text-base leading-relaxed break-words",
                  isDeleted && "italic opacity-60",
                  isMine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {/* 핀 표시 */}
                {isPinned && !isDeleted && (
                  <div className={cn(
                    "mb-1 inline-flex items-center gap-1 text-xs font-semibold",
                    isMine ? "text-primary-foreground/80" : "text-amber-700",
                  )}>
                    <Pin className="h-3 w-3" /> 고정됨
                  </div>
                )}

                {isDeleted ? (
                  <span>삭제된 메시지입니다</span>
                ) : (
                  <>
                    {m.imageUrl && (
                      <a href={m.imageUrl} target="_blank" rel="noopener noreferrer" className="block mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.imageUrl}
                          alt="첨부 사진"
                          className="rounded-lg max-h-64 object-cover"
                        />
                      </a>
                    )}
                    {m.content && (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </>
                )}

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

                {/* 액션 메뉴 (호버) */}
                {!isDeleted && (
                  <div className={cn(
                    "absolute top-1",
                    isMine ? "-left-9" : "-right-9",
                  )}>
                    <button
                      type="button"
                      onClick={() => setMenuOpenId(menuOpenId === m.id ? null : m.id)}
                      aria-label="메시지 메뉴"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-full bg-background border flex items-center justify-center hover:bg-muted"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpenId === m.id && (
                      <div className={cn(
                        "absolute top-7 z-10 min-w-[140px] rounded-lg border-2 bg-popover shadow-lg overflow-hidden",
                        isMine ? "right-0" : "left-0",
                      )}>
                        <button
                          type="button"
                          onClick={() => togglePin(m)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-muted"
                        >
                          {isPinned ? (
                            <><PinOff className="h-4 w-4" /> 핀 해제</>
                          ) : (
                            <><Pin className="h-4 w-4" /> 핀 (즐겨찾기)</>
                          )}
                        </button>
                        {isMine && (
                          <button
                            type="button"
                            onClick={() => deleteMessage(m)}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-muted text-destructive"
                          >
                            <Trash2 className="h-4 w-4" /> 삭제
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* 타이핑 표시 */}
        {data.otherTyping && !showingSpecial && (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground rounded-2xl px-4 py-3 text-base inline-flex items-center gap-2">
              <span className="flex gap-1">
                <span className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              <span className="text-sm text-muted-foreground">상대방이 입력 중...</span>
            </div>
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      {!showingSpecial && (
        <div className="border-t p-3">
          {error && (
            <div className="mb-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          {/* 첨부 미리보기 */}
          {pendingImage && (
            <div className="mb-2 relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImage} alt="첨부 미리보기" className="h-20 rounded-lg object-cover border-2" />
              <button
                type="button"
                onClick={() => setPendingImage(null)}
                className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-1 shadow-md"
                aria-label="첨부 취소"
              >
                <X className="h-3 w-3" strokeWidth={3} />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPickImage}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || sending}
              aria-label="사진 첨부"
              className="h-14 w-14 shrink-0"
            >
              <ImagePlus className="h-5 w-5" />
            </Button>
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                pingTyping();
              }}
              onKeyDown={onKeyDown}
              placeholder={pendingImage ? "사진과 함께 보낼 메시지 (선택)" : "메시지를 입력하세요 (Enter 전송)"}
              rows={2}
              maxLength={2000}
              className="flex-1 resize-none rounded-lg border-2 border-input bg-background px-4 py-2 text-base leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={sending}
            />
            <Button
              type="button"
              size="lg"
              onClick={onSend}
              disabled={sending || (!input.trim() && !pendingImage)}
              aria-label="메시지 전송"
              className="h-14 px-5"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{uploading ? "사진 업로드 중..." : "Enter 전송 · Shift+Enter 줄바꿈"}</span>
            <span>{input.length} / 2000</span>
          </div>
        </div>
      )}
    </div>
  );
}
