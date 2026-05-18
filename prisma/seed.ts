// Prisma Seed — 테스트 계정 생성
// 실행: npx prisma db seed  또는  npm run db:seed
//
// 멱등성: upsert 사용 → 여러 번 실행해도 안전

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 테스트 계정 시딩 시작...");

  const hashedPw = await bcrypt.hash("test1234", 10);
  const adminPw = await bcrypt.hash("admin1234", 10);

  // ============================================================
  // 1. 환자 계정
  // ============================================================
  const patient = await prisma.user.upsert({
    where: { email: "patient@test.com" },
    update: {},
    create: {
      email: "patient@test.com",
      password: hashedPw,
      name: "김환자",
      phoneNumber: "010-1111-1111",
      role: "PATIENT",
      status: "ACTIVE",
      patient: {
        create: {
          birthDate: new Date("1990-01-01"),
          gender: "MALE",
          sido: "서울",
          sigungu: "강남구",
          dong: "역삼동",
          hasInsurance: true,
        },
      },
    },
    select: { id: true, email: true, name: true },
  });
  console.log(`  ✅ 환자: ${patient.email} (${patient.name})`);

  // ============================================================
  // 2. 의사 계정 + 병원
  // ============================================================
  const clinic = await prisma.clinic.upsert({
    where: { businessNumber: "123-45-67890" },
    update: {},
    create: {
      name: "테스트 임플란트 치과",
      businessNumber: "123-45-67890",
      phoneNumber: "02-1234-5678",
      description: "테스트용 치과입니다. 임플란트 전문.",
      sido: "서울",
      sigungu: "강남구",
      dong: "역삼동",
      detailAddress: "테헤란로 123, 5층",
      zipCode: "06234",
      latitude: 37.5009,
      longitude: 127.0367,
      rating: 4.5,
      reviewCount: 0,
      isPremium: true,
      hasParking: true,
      priceRange: "MEDIUM",
      implantBrands: {
        create: [
          { brandName: "오스템" },
          { brandName: "스트라우만" },
          { brandName: "노벨" },
        ],
      },
      businessHours: {
        create: [
          { dayOfWeek: "MONDAY", openTime: "09:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: "TUESDAY", openTime: "09:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: "WEDNESDAY", openTime: "09:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: "THURSDAY", openTime: "09:00", closeTime: "18:00", isClosed: false },
          { dayOfWeek: "FRIDAY", openTime: "09:00", closeTime: "20:00", isClosed: false },
          { dayOfWeek: "SATURDAY", openTime: "09:00", closeTime: "13:00", isClosed: false },
          { dayOfWeek: "SUNDAY", isClosed: true },
        ],
      },
    },
    select: { id: true, name: true },
  });
  console.log(`  ✅ 병원: ${clinic.name}`);

  const dentist = await prisma.user.upsert({
    where: { email: "dentist@test.com" },
    update: {},
    create: {
      email: "dentist@test.com",
      password: hashedPw,
      name: "이의사",
      phoneNumber: "010-2222-2222",
      role: "DENTIST",
      status: "ACTIVE",
      dentist: {
        create: {
          clinicId: clinic.id,
          licenseNumber: "LIC-TEST-001",
          specialization: "임플란트, 보철",
          yearsOfExperience: 10,
          education: "서울대학교 치의학전문대학원",
          introduction:
            "10년 이상의 임플란트 경험을 바탕으로 정확한 진단과 친절한 상담을 약속드립니다.",
          isVerified: true,
        },
      },
    },
    select: { id: true, email: true, name: true },
  });
  console.log(`  ✅ 의사: ${dentist.email} (${dentist.name})`);

  // ============================================================
  // 3. 관리자 계정
  // ============================================================
  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      password: adminPw,
      name: "관리자",
      phoneNumber: "010-9999-9999",
      role: "ADMIN",
      status: "ACTIVE",
    },
    select: { id: true, email: true, name: true },
  });
  console.log(`  ✅ 관리자: ${admin.email} (${admin.name})`);

  console.log("\n=================================================");
  console.log("🔑 테스트 로그인 정보");
  console.log("=================================================");
  console.log("환자:    patient@test.com / test1234");
  console.log("의사:    dentist@test.com / test1234");
  console.log("관리자:  admin@test.com   / admin1234");
  console.log("=================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ 시딩 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
