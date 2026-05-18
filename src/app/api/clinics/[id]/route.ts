// 병원 정보 수정 — 소속 치과의사만
// PATCH /api/clinics/:id

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
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
  implantBrands: z.array(z.string()).optional(),
  businessHours: z
    .array(
      z.object({
        dayOfWeek: z.enum([
          "MONDAY",
          "TUESDAY",
          "WEDNESDAY",
          "THURSDAY",
          "FRIDAY",
          "SATURDAY",
          "SUNDAY",
        ]),
        openTime: z.string().optional(),
        closeTime: z.string().optional(),
        breakStart: z.string().optional(),
        breakEnd: z.string().optional(),
        isClosed: z.boolean().default(false),
      }),
    )
    .optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  // 본인이 소속된 병원인지 확인
  const dentist = await prisma.dentist.findUnique({
    where: { id: session.user.id },
    select: { clinicId: true },
  });
  if (!dentist?.clinicId || dentist.clinicId !== params.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (data.implantBrands !== undefined) {
      await tx.clinicImplantBrand.deleteMany({ where: { clinicId: params.id } });
      if (data.implantBrands.length > 0) {
        await tx.clinicImplantBrand.createMany({
          data: data.implantBrands.map((brandName) => ({ clinicId: params.id, brandName })),
        });
      }
    }
    if (data.businessHours !== undefined) {
      await tx.clinicBusinessHours.deleteMany({ where: { clinicId: params.id } });
      if (data.businessHours.length > 0) {
        await tx.clinicBusinessHours.createMany({
          data: data.businessHours.map((h) => ({
            clinicId: params.id,
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime,
            closeTime: h.closeTime,
            breakStart: h.breakStart,
            breakEnd: h.breakEnd,
            isClosed: h.isClosed,
          })),
        });
      }
    }
    return tx.clinic.update({
      where: { id: params.id },
      data: {
        name: data.name,
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
      },
    });
  });

  return NextResponse.json(updated);
}
