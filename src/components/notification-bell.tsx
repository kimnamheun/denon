"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";

import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  desc: string;
  href: string;
  at: string;
}

export function NotificationBell() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  // 외부 클릭 닫기
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // 인증된 사용자에 대해서만 fetch
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    const load = () => {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((data: { items: NotificationItem[]; unreadCount: number }) => {
          if (cancelled) return;
          setItems(data.items);
          setUnreadCount(data.unreadCount);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000); // 1분마다 갱신
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status]);

  if (status !== "authenticated") return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 -mr-1 rounded-md hover:bg-muted"
        aria-label="알림"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-background border rounded-lg shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b font-semibold text-sm">
            알림 {unreadCount > 0 && <span className="text-blue-600">({unreadCount})</span>}
          </div>
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              새 알림이 없습니다
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="border-b last:border-0">
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={cn("block px-4 py-3 hover:bg-muted")}
                  >
                    <div className="text-sm font-medium line-clamp-1">{n.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {n.desc}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.at).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
