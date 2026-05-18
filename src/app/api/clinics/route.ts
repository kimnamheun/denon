// 병원 등록 — 치과의사가 자신의 병원을 등록 (1인 1병원 가정)
// POST /api/clinics

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const clinicSchema = z.object({
  name: z.string().min(1).max(255),
  businessNumber: z.string().min(1).max(20),
  phoneNumber: z.string().max(20).optional(),
  description: z.string().optional(),
  sido: z.string().max(50).optional(),
  sigungu: z.string().max(50).optional(),
  dong: z.string().max(50).optional(),
  detailAddress: z.string().optional(),
  zipCode: z.string().max(10).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  hasParking: z.boolean().optional(),
  priceRange: z.enum(["LOW", "MEDIUM", "HIGH", "PREMIUM"]).optional(),
  implantBrands: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "DENTIST") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // 이미 병원 소속이면 거부
  const dentist = await prisma.dentist.findUnique({
    where: { id: session.user.id },
    select: { clinicId: true },
  });
  if (dentist?.clinicId) {
    return NextResponse.json(
      { error: "ALREADY_REGISTERED", message: "이미 병원에 소속되어 있습니다" },
      { status: 400 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = clinicSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const clinic = await prisma.$transaction(async (tx) => {
      const c = await tx.clinic.create({
        data: {
          name: data.name,
          businessNumber: data.businessNumber,
          phoneNumber: data.phoneNumber,
          description: data.description,
          sido: data.sido,
          sigungu: data.sigungu,
          dong: data.dong,
          detailAddress: data.detailAddress,
          zipCode: data.zipCode,
          latitude: data.latitude,
          longitude: data.longitude,
          hasParking: data.hasParking,
          priceRange: data.priceRange,
          implantBrands: {
            create: data.implantBrands.map((brandName) => ({ brandName })),
          },
        },
      });
      // 의사를 병원에 연결
      await tx.dentist.update({
        where: { id: session.user.id },
        data: { clinicId: c.id },
      });
      return c;
    });

    return NextResponse.json(clinic, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "DUPLICATE", message: "이미 등록된 사업자번호입니다" },
        { status: 409 },
      );
    }
    console.error("[clinics POST] error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
