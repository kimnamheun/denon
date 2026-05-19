// 지역별 인기 치과
// GET /api/clinics/by-region?sido=서울

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sido = searchParams.get("sido");

  const where: Prisma.ClinicWhereInput = { deletedAt: null };
  if (sido) where.sido = sido;

  const clinics = await prisma.clinic.findMany({
    where,
    select: {
      id: true,
      name: true,
      sido: true,
      sigungu: true,
      rating: true,
      reviewCount: true,
      isPremium: true,
      implantBrands: { select: { brandName: true } },
    },
    orderBy: [{ isPremium: "desc" }, { rating: "desc" }, { reviewCount: "desc" }],
    take: 6,
  });

  return NextResponse.json(
    clinics.map((c) => ({ ...c, rating: Number(c.rating) })),
  );
}
