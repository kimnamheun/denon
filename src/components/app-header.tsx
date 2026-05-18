"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function AppHeader() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;

  const navLinks: { href: string; label: string }[] = [];
  if (role === "PATIENT") {
    navLinks.push(
      { href: "/patient/dashboard", label: "대시보드" },
      { href: "/patient/quotation-requests", label: "내 견적 요청" },
      { href: "/patient/quotations", label: "받은 견적서" },
      { href: "/patient/appointments", label: "예약" },
      { href: "/clinics/search", label: "병원 검색" },
    );
  } else if (role === "DENTIST") {
    navLinks.push(
      { href: "/dentist/dashboard", label: "대시보드" },
      { href: "/dentist/quotation-requests/available", label: "견적 요청" },
      { href: "/dentist/quotations/submitted", label: "작성한 견적서" },
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
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="font-bold">
          🦷 임플란트 플랫폼
        </Link>

        <nav className="hidden md:flex gap-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}>
              <Button variant="ghost" size="sm">
                {l.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {status === "loading" ? null : session?.user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {session.user.name}
              </span>
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                로그아웃
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">로그인</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">회원가입</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
