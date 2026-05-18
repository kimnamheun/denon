// 관리자: 사용자 목록 조회 (검색/필터/페이지네이션)
// GET /api/admin/users?role=DENTIST&status=ACTIVE&q=email&page=1&size=20

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role"); // PATIENT | DENTIST | ADMIN
  const status = searchParams.get("status");
  const q = searchParams.get("q");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const size = Math.min(100, Number(searchParams.get("size") ?? "20"));

  const where: Prisma.UserWhereInput = { deletedAt: null };
  if (role) where.role = role as Prisma.UserWhereInput["role"];
  if (status) where.status = status as Prisma.UserWhereInput["status"];
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        dentist: {
          select: {
            licenseNumber: true,
            specialization: true,
            isVerified: true,
            clinic: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * size,
      take: size,
    }),
  ]);

  return NextResponse.json({ total, page, size, users });
}
