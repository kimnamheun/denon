// 병원 검색 — 위경도 반경 기반
// GET /api/clinics/search?lat=37.5&lng=127.0&radius=5&brand=오스템&premium=true

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Math.min(Number(searchParams.get("radius") ?? "5"), 50); // km, 최대 50

  // 필터 옵션
  const brands = searchParams.getAll("brand").filter(Boolean); // 다중 선택 가능
  const premium = searchParams.get("premium") === "true";
  const hasParking = searchParams.get("hasParking") === "true";
  const priceRangeRaw = searchParams.get("priceRange"); // LOW/MEDIUM/HIGH/PREMIUM
  const minRating = Number(searchParams.get("minRating") ?? "0"); // 0~5
  const sortBy = searchParams.get("sortBy") ?? "distance"; // distance | rating | reviews

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "lat, lng 가 필요합니다" },
      { status: 400 },
    );
  }

  // 위경도 1도 ≈ 111km (대략적 bounding box 필터)
  // 정확한 거리 계산은 Postgres earthdistance 또는 cube extension 필요 — MVP 는 박스 필터로
  const latDelta = radius / 111;
  const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180));

  const where: Prisma.ClinicWhereInput = {
    deletedAt: null,
    latitude: { gte: lat - latDelta, lte: lat + latDelta },
    longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
  };
  if (premium) where.isPremium = true;
  if (hasParking) where.hasParking = true;
  if (minRating > 0) where.rating = { gte: minRating };
  if (priceRangeRaw && ["LOW", "MEDIUM", "HIGH", "PREMIUM"].includes(priceRangeRaw)) {
    where.priceRange = priceRangeRaw as Prisma.ClinicWhereInput["priceRange"];
  }
  if (brands.length > 0) {
    where.implantBrands = { some: { brandName: { in: brands } } };
  }

  const clinics = await prisma.clinic.findMany({
    where,
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      sido: true,
      sigungu: true,
      dong: true,
      latitude: true,
      longitude: true,
      rating: true,
      reviewCount: true,
      isPremium: true,
      priceRange: true,
      implantBrands: { select: { brandName: true } },
    },
    orderBy: [{ isPremium: "desc" }, { rating: "desc" }],
    take: 100,
  });

  // 클라이언트 거리 계산 + 정렬 (Haversine 근사)
  const withDist = clinics
    .map((c) => {
      const cLat = Number(c.latitude ?? 0);
      const cLng = Number(c.longitude ?? 0);
      const dKm = haversine(lat, lng, cLat, cLng);
      return { ...c, latitude: cLat, longitude: cLng, distance: dKm };
    })
    .filter((c) => c.distance <= radius);

  // 정렬: distance(기본) | rating | reviews. premium 은 항상 상단 우선
  withDist.sort((a, b) => {
    if (a.isPremium !== b.isPremium) return a.isPremium ? -1 : 1;
    if (sortBy === "rating") return Number(b.rating) - Number(a.rating);
    if (sortBy === "reviews") return b.reviewCount - a.reviewCount;
    return a.distance - b.distance;
  });

  return NextResponse.json(withDist);
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
