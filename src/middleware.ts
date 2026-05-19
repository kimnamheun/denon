// Next.js Middleware - 역할 기반 라우트 보호
// Auth.js v5 의 auth() 헬퍼로 세션 확인 후 차단/리다이렉트

import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = [
  "/",
  "/about",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/clinics", // /clinics/search, /clinics/:id 등 공개
];

const PATIENT_PREFIX = "/patient";
const DENTIST_PREFIX = "/dentist";
const ADMIN_PREFIX = "/admin";

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // API 라우트는 각자 세션·권한 체크하므로 미들웨어 통과
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/clinics/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return false;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const session = req.auth;

  // 비로그인 → 로그인 페이지로
  if (!session?.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 역할별 영역 검사
  const role = session.user.role;

  if (pathname.startsWith(PATIENT_PREFIX) && role !== "PATIENT") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (pathname.startsWith(DENTIST_PREFIX) && role !== "DENTIST") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (pathname.startsWith(ADMIN_PREFIX) && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // 미들웨어 적용 매칭: 정적 자산, _next, image 등은 제외
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
