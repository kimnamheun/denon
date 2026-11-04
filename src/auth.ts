// Auth.js v5 (next-auth) — 메인 설정
// Credentials Provider 기반 이메일/비밀번호 인증 + JWT 세션 + 역할 정보 포함
//
// 사용:
//   import { auth, signIn, signOut } from "@/auth";
//   const session = await auth();   // server component
//
// API route: src/app/api/auth/[...nextauth]/route.ts → export const { GET, POST } = handlers

import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // next-auth v5 beta 와 @auth/prisma-adapter 가 별도 @auth/core 버전을 끌어와
  // 타입이 두 곳에 중복 선언됨 → 알려진 이슈, 캐스팅으로 해결
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            status: true,
            deletedAt: true,
          },
        });

        if (!user || !user.password) return null;
        if (user.status !== "ACTIVE" || user.deletedAt) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 로그인 시점에만 user 가 채워짐 → token 에 role/id 보관
      if (user) {
        token.id = user.id as string;
        token.role = user.role as UserRole;
        return token;
      }

      // 이후 요청마다 회원 상태를 다시 확인한다 — 관리자가 정지(SUSPENDED)·비활성 처리하거나
      // 탈퇴(deletedAt)하면 토큰이 남아 있어도 바로 로그아웃 상태가 된다.
      // 미들웨어(edge 런타임)에서는 DB 를 못 쓰므로 건너뛰고, API·서버 컴포넌트(node)에서 막는다.
      if (process.env.NEXT_RUNTIME === "edge" || !token.id) return token;
      const current = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { status: true, role: true, deletedAt: true },
      });
      if (!current || current.status !== "ACTIVE" || current.deletedAt) return null;
      token.role = current.role;
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
});
