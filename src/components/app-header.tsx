"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";

export function AppHeader() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks: { href: string; label: string }[] = [];
  if (role === "PATIENT") {
    navLinks.push(
      { href: "/patient/dashboard", label: "대시보드" },
      { href: "/patient/quotation-requests", label: "내 견적 요청" },
      { href: "/patient/quotations", label: "받은 견적서" },
      { href: "/patient/chat", label: "상담 문의" },
      { href: "/patient/appointments", label: "예약" },
      { href: "/clinics/search", label: "병원 검색" },
    );
  } else if (role === "DENTIST") {
    navLinks.push(
      { href: "/dentist/dashboard", label: "대시보드" },
      { href: "/dentist/quotation-requests/available", label: "견적 요청" },
      { href: "/dentist/quotations/submitted", label: "작성한 견적서" },
      { href: "/dentist/chat", label: "상담 문의" },
      { href: "/dentist/appointments", label: "상담 일정" },
      { href: "/dentist/clinic-settings", label: "병원 설정" },
    );
  } else if (role === "ADMIN") {
    navLinks.push(
      { href: "/admin/dashboard", label: "관리자 대시보드" },
      { href: "/admin/users", label: "사용자" },
      { href: "/admin/dentists", label: "치과 인증" },
      { href: "/admin/clinics", label: "병원" },
    );
  } else {
    navLinks.push({ href: "/clinics/search", label: "병원 검색" });
  }

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="container flex h-16 items-center justify-between gap-2">
        <Link href="/" className="text-lg font-bold whitespace-nowrap">
          🦷 임플란트 플랫폼
        </Link>

        {/* 데스크탑 네비게이션 */}
        <nav className="hidden md:flex gap-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}>
              <Button variant="ghost" size="sm" className="text-base h-10">
                {l.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {session?.user && <NotificationBell />}
          {status === "loading" ? null : session?.user ? (
            <>
              <span className="text-base text-muted-foreground hidden sm:inline">
                {session.user.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex h-10 text-base"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                로그아웃
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="hidden sm:inline-block">
                <Button variant="ghost" size="sm" className="h-10 text-base">
                  로그인
                </Button>
              </Link>
              <Link href="/auth/register" className="hidden sm:inline-block">
                <Button size="sm" className="h-10 text-base">회원가입</Button>
              </Link>
            </>
          )}

          {/* 모바일 햄버거 — 노년 친화: 큰 터치 영역 */}
          <button
            type="button"
            className="md:hidden p-2.5 -mr-2 rounded-lg hover:bg-muted"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="메뉴 열기"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 — 노년 친화: 큰 항목, 본문 폰트 */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-3 flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-lg text-base font-medium hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}

            <div className="border-t mt-3 pt-3">
              {session?.user ? (
                <>
                  <div className="px-4 py-1 text-sm text-muted-foreground">
                    {session.user.email}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="block w-full text-left px-4 py-3 rounded-lg text-base font-medium hover:bg-muted"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-lg text-base font-medium hover:bg-muted"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-lg text-base font-medium hover:bg-muted"
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
