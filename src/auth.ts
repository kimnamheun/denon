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
          },
        });

        if (!user || !user.password) return null;
        if (user.status !== "ACTIVE") return null;

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
      // 로그인 시점에만 user 가 채워짐 → token 에 role/id 영구 보관
      if (user) {
        token.id = user.id as string;
        token.role = user.role as UserRole;
      }
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
