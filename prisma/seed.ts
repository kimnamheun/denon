// Prisma Seed — 테스트 계정 + 더미 마켓 데이터
// 실행: npm run db:seed (멱등성 보장 — upsert)

import "dotenv/config";
import { PrismaClient, type Urgency } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ===== Helpers =====
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const sample = <T>(arr: readonly T[], n: number): T[] =>
  [...arr].sort(() => Math.random() - 0.5).slice(0, n);
const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

// ===== Static data =====
const KOREAN_FIRST = ["민수", "지영", "성호", "수진", "준혁", "예린", "동현", "서윤", "재민", "하은"];
const KOREAN_LAST = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const TOOTH_NUMBERS = ["11", "12", "13", "14", "15", "16", "17", "18", "21", "22", "23", "24", "25", "26", "27", "31", "32", "33", "34", "35", "36", "37", "41", "42", "43", "44", "45", "46", "47"];
const IMPLANT_BRANDS = ["오스템", "스트라우만", "노벨", "덴티스", "메가젠", "디오"];
const SYMPTOM_TEMPLATES = [
  "오른쪽 어금니가 시리고 음식을 씹을 때 통증이 있습니다. 임플란트가 필요한지 상담받고 싶어요.",
  "예전에 발치한 자리에 임플란트를 심으려고 합니다. 견적 부탁드립니다.",
  "잇몸에서 피가 자주 나고 흔들리는 치아가 있습니다. 임플란트가 필요할 것 같아 견적 요청드립니다.",
  "위쪽 어금니가 빠진 지 오래되어 임플란트를 고려 중입니다. 가격대를 알고 싶습니다.",
  "교통사고로 앞니가 손상되어 임플란트를 알아보고 있습니다. 빠른 상담 부탁드려요.",
  "치주염으로 치아를 발치해야 한다고 들었습니다. 임플란트 비용이 궁금합니다.",
  "어금니 2개가 흔들려서 임플란트 견적 받고 싶어요. 보증기간도 함께 안내 부탁드립니다.",
  "기존 보철물이 오래되어 교체가 필요합니다. 임플란트로 가능한지 견적 부탁드립니다.",
];
const REVIEW_TEMPLATES = [
  "친절하시고 설명이 자세해서 만족했습니다. 시술 후 통증도 적었어요.",
  "위치도 좋고 시설이 깨끗합니다. 임플란트 결과도 만족스러워요.",
  "가격 대비 만족도가 높습니다. 다른 분들께도 추천합니다.",
  "처음엔 걱정이 많았는데 원장님께서 차근차근 설명해주셔서 안심하고 받았어요.",
  "주차도 편하고 예약 시간 잘 지켜집니다. 재방문 의사 있습니다.",
  "상담부터 시술까지 일관된 케어를 받았습니다. 만족스러운 경험이었어요.",
  "임플란트 후 사후관리도 꼼꼼히 해주십니다. 강력 추천합니다.",
  "통증이 거의 없었고 회복도 빨랐어요. 친구에게도 소개했습니다.",
];

const CLINIC_DATA: ReadonlyArray<{
  name: string;
  businessNumber: string;
  phone: string;
  sido: string;
  sigungu: string;
  dong: string;
  lat: number;
  lng: number;
  rating: number;
  isPremium: boolean;
  brands: string[];
}> = [
  {
    name: "강남스마일치과",
    businessNumber: "211-22-33001",
    phone: "02-555-1100",
    sido: "서울",
    sigungu: "강남구",
    dong: "역삼동",
    lat: 37.5004,
    lng: 127.0364,
    rating: 4.8,
    isPremium: true,
    brands: ["오스템", "스트라우만", "노벨"],
  },
  {
    name: "송파플란트치과",
    businessNumber: "211-22-33002",
    phone: "02-555-2200",
    sido: "서울",
    sigungu: "송파구",
    dong: "잠실동",
    lat: 37.5133,
    lng: 127.1,
    rating: 4.6,
    isPremium: true,
    brands: ["오스템", "메가젠", "디오"],
  },
  {
    name: "마포연세치과의원",
    businessNumber: "211-22-33003",
    phone: "02-555-3300",
    sido: "서울",
    sigungu: "마포구",
    dong: "공덕동",
    lat: 37.5447,
    lng: 126.9505,
    rating: 4.3,
    isPremium: false,
    brands: ["오스템", "덴티스"],
  },
  {
    name: "분당위드플란트치과",
    businessNumber: "211-22-33004",
    phone: "031-555-4400",
    sido: "경기",
    sigungu: "성남시 분당구",
    dong: "정자동",
    lat: 37.367,
    lng: 127.108,
    rating: 4.7,
    isPremium: true,
    brands: ["스트라우만", "노벨", "오스템"],
  },
  {
    name: "성북바른치과",
    businessNumber: "211-22-33005",
    phone: "02-555-5500",
    sido: "서울",
    sigungu: "성북구",
    dong: "안암동",
    lat: 37.586,
    lng: 127.029,
    rating: 4.1,
    isPremium: false,
    brands: ["오스템", "디오"],
  },
];

const PATIENT_DATA: ReadonlyArray<{ email: string; first: string; last: string; sido: string; sigungu: string }> = [
  { email: "patient1@test.com", last: "김", first: "민수", sido: "서울", sigungu: "강남구" },
  { email: "patient2@test.com", last: "이", first: "지영", sido: "서울", sigungu: "송파구" },
  { email: "patient3@test.com", last: "박", first: "성호", sido: "경기", sigungu: "성남시 분당구" },
  { email: "patient4@test.com", last: "최", first: "수진", sido: "서울", sigungu: "마포구" },
  { email: "patient5@test.com", last: "정", first: "준혁", sido: "서울", sigungu: "성북구" },
];

const DENTIST_DATA: ReadonlyArray<{
  email: string;
  name: string;
  license: string;
  clinicIdx: number;
  spec: string;
  years: number;
}> = [
  {
    email: "dentist1@test.com",
    name: "박지훈",
    license: "LIC-D-001",
    clinicIdx: 0,
    spec: "임플란트, 보철",
    years: 12,
  },
  {
    email: "dentist2@test.com",
    name: "김민영",
    license: "LIC-D-002",
    clinicIdx: 1,
    spec: "임플란트, 교정",
    years: 8,
  },
  {
    email: "dentist3@test.com",
    name: "이수현",
    license: "LIC-D-003",
    clinicIdx: 3,
    spec: "임플란트, 보철",
    years: 15,
  },
];

// ============================================================
async function main() {
  console.log("🌱 시딩 시작...\n");

  const hashedPw = await bcrypt.hash("test1234", 10);
  const adminPw = await bcrypt.hash("admin1234", 10);

  // ========== 1. 기본 테스트 계정 ==========
  const mainPatient = await prisma.user.upsert({
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
    select: { id: true, email: true },
  });
  console.log(`✅ 기본 환자: ${mainPatient.email}`);

  const mainClinic = await prisma.clinic.upsert({
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
      implantBrands: { create: [{ brandName: "오스템" }, { brandName: "스트라우만" }, { brandName: "노벨" }] },
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
  console.log(`✅ 기본 병원: ${mainClinic.name}`);

  const mainDentist = await prisma.user.upsert({
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
          clinicId: mainClinic.id,
          licenseNumber: "LIC-TEST-001",
          specialization: "임플란트, 보철",
          yearsOfExperience: 10,
          isVerified: true,
        },
      },
    },
    select: { id: true, email: true },
  });
  console.log(`✅ 기본 의사: ${mainDentist.email}`);

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
    select: { id: true, email: true },
  });
  console.log(`✅ 관리자: ${admin.email}`);

  // ========== 2. 더미 병원 5곳 ==========
  console.log("\n🏥 더미 병원 생성...");
  const clinicIds: string[] = [];
  for (const cd of CLINIC_DATA) {
    const c = await prisma.clinic.upsert({
      where: { businessNumber: cd.businessNumber },
      update: {},
      create: {
        name: cd.name,
        businessNumber: cd.businessNumber,
        phoneNumber: cd.phone,
        description: `${cd.sido} ${cd.sigungu}에 위치한 임플란트 전문 치과입니다.`,
        sido: cd.sido,
        sigungu: cd.sigungu,
        dong: cd.dong,
        latitude: cd.lat,
        longitude: cd.lng,
        rating: cd.rating,
        reviewCount: 0, // 후에 리뷰 시딩 시 재집계
        isPremium: cd.isPremium,
        hasParking: Math.random() > 0.3,
        priceRange: pick(["LOW", "MEDIUM", "HIGH", "PREMIUM"] as const),
        implantBrands: { create: cd.brands.map((b) => ({ brandName: b })) },
        businessHours: {
          create: [
            { dayOfWeek: "MONDAY", openTime: "09:00", closeTime: "18:00", isClosed: false },
            { dayOfWeek: "TUESDAY", openTime: "09:00", closeTime: "18:00", isClosed: false },
            { dayOfWeek: "WEDNESDAY", openTime: "09:00", closeTime: "18:00", isClosed: false },
            { dayOfWeek: "THURSDAY", openTime: "09:00", closeTime: "18:00", isClosed: false },
            { dayOfWeek: "FRIDAY", openTime: "09:00", closeTime: "19:00", isClosed: false },
            { dayOfWeek: "SATURDAY", openTime: "09:00", closeTime: "13:00", isClosed: false },
            { dayOfWeek: "SUNDAY", isClosed: true },
          ],
        },
      },
      select: { id: true },
    });
    clinicIds.push(c.id);
    console.log(`  - ${cd.name}`);
  }

  // ========== 3. 더미 의사 3명 ==========
  console.log("\n👨‍⚕️ 더미 의사 생성...");
  for (const dd of DENTIST_DATA) {
    await prisma.user.upsert({
      where: { email: dd.email },
      update: {},
      create: {
        email: dd.email,
        password: hashedPw,
        name: dd.name,
        phoneNumber: `010-3${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        role: "DENTIST",
        status: "ACTIVE",
        dentist: {
          create: {
            clinicId: clinicIds[dd.clinicIdx],
            licenseNumber: dd.license,
            specialization: dd.spec,
            yearsOfExperience: dd.years,
            isVerified: true,
          },
        },
      },
    });
    console.log(`  - ${dd.name} (${dd.email})`);
  }

  // ========== 4. 더미 환자 5명 ==========
  console.log("\n🧑 더미 환자 생성...");
  const patientIds: string[] = [];
  for (const pd of PATIENT_DATA) {
    const p = await prisma.user.upsert({
      where: { email: pd.email },
      update: {},
      create: {
        email: pd.email,
        password: hashedPw,
        name: pd.last + pd.first,
        phoneNumber: `010-4${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        role: "PATIENT",
        status: "ACTIVE",
        patient: {
          create: {
            sido: pd.sido,
            sigungu: pd.sigungu,
            gender: pick(["MALE", "FEMALE"] as const),
            hasInsurance: Math.random() > 0.4,
          },
        },
      },
      select: { id: true },
    });
    patientIds.push(p.id);
    console.log(`  - ${pd.last}${pd.first}`);
  }

  // ========== 5. 견적 요청 8건 ==========
  console.log("\n📋 견적 요청 생성...");
  const requestIds: string[] = [];
  for (let i = 0; i < 8; i++) {
    const patientId = pick(patientIds);
    const teethCount = 1 + Math.floor(Math.random() * 3);
    const teeth = sample(TOOTH_NUMBERS, teethCount);
    const urgency = pick(["LOW", "MEDIUM", "HIGH"] as const satisfies readonly Urgency[]);
    const minBudget = (1 + Math.floor(Math.random() * 3)) * 1000000;
    const maxBudget = minBudget + (1 + Math.floor(Math.random() * 3)) * 1000000;
    const created = minutesAgo(15 + i * 90 + Math.floor(Math.random() * 60));

    const r = await prisma.quotationRequest.create({
      data: {
        patientId,
        symptoms: pick(SYMPTOM_TEMPLATES),
        urgency,
        minBudget: BigInt(minBudget),
        maxBudget: BigInt(maxBudget),
        preferredImplantBrand: pick(IMPLANT_BRANDS),
        status: "OPEN",
        createdAt: created,
        missingTeeth: { create: teeth.map((t) => ({ toothNumber: t })) },
      },
      select: { id: true },
    });
    requestIds.push(r.id);
  }
  console.log(`  ${requestIds.length}건 생성`);

  // ========== 6. 견적서 (각 요청당 1~3건) ==========
  console.log("\n💰 견적서 생성...");
  const allDentists = await prisma.dentist.findMany({
    where: { isVerified: true, clinicId: { not: null } },
    select: { id: true, clinicId: true },
  });
  let quotationCount = 0;
  for (const reqId of requestIds) {
    const numQuotes = 1 + Math.floor(Math.random() * 3);
    const selectedDentists = sample(allDentists, Math.min(numQuotes, allDentists.length));

    for (const d of selectedDentists) {
      const teeth = (await prisma.quotationRequestMissingTooth.findMany({
        where: { requestId: reqId },
        select: { toothNumber: true },
      })).map((t) => t.toothNumber);

      const implantUnitPrice = (15 + Math.floor(Math.random() * 12)) * 100000;
      const implantTotal = implantUnitPrice * teeth.length;
      const additionalTotal = Math.random() > 0.5 ? 200000 + Math.floor(Math.random() * 500000) : 0;
      const totalAmount = implantTotal + additionalTotal;
      const discountRate = Math.random() > 0.6 ? 5 + Math.floor(Math.random() * 10) : 0;
      const discountAmount = Math.floor((totalAmount * discountRate) / 100);
      const finalAmount = totalAmount - discountAmount;
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const brand = pick(IMPLANT_BRANDS);

      try {
        await prisma.quotation.create({
          data: {
            quotationRequestId: reqId,
            dentistId: d.id,
            clinicId: d.clinicId!,
            treatmentPlan: `${teeth.length}개 치아 ${brand} 임플란트 시술 계획. 약 ${
              2 + Math.floor(Math.random() * 4)
            }개월 소요 예정.`,
            implantTotalAmount: BigInt(implantTotal),
            additionalTotalAmount: BigInt(additionalTotal),
            totalAmount: BigInt(totalAmount),
            discountRate,
            discountAmount: BigInt(discountAmount),
            finalAmount: BigInt(finalAmount),
            treatmentDuration: 2 + Math.floor(Math.random() * 4),
            warrantyPeriod: 5 + Math.floor(Math.random() * 5),
            validUntil,
            status: "PENDING",
            implantItems: {
              create: teeth.map((t, idx) => ({
                toothNumber: t,
                brand,
                quantity: 1,
                unitPrice: BigInt(implantUnitPrice),
                subtotal: BigInt(implantUnitPrice),
                displayOrder: idx,
              })),
            },
            ...(additionalTotal > 0 && {
              additionalItems: {
                create: [
                  {
                    description: "본 이식술",
                    price: BigInt(additionalTotal),
                    displayOrder: 0,
                  },
                ],
              },
            }),
          },
        });
        quotationCount++;
      } catch {
        // unique (request, dentist) 중복 시 skip
      }
    }
  }
  console.log(`  ${quotationCount}건 생성`);

  // ========== 7. 완료된 상담 + 리뷰 ==========
  console.log("\n⭐ 완료된 상담 + 리뷰 생성...");
  let reviewCount = 0;
  for (let i = 0; i < 10; i++) {
    const patientId = pick(patientIds);
    const d = pick(allDentists);
    if (!d.clinicId) continue;

    const past = new Date(Date.now() - (3 + i) * 24 * 60 * 60 * 1000);
    const consult = await prisma.consultation.create({
      data: {
        patientId,
        dentistId: d.id,
        clinicId: d.clinicId,
        scheduledAt: past,
        duration: 30,
        status: "COMPLETED",
      },
      select: { id: true },
    });

    await prisma.review.create({
      data: {
        patientId,
        dentistId: d.id,
        clinicId: d.clinicId,
        rating: 3 + Math.floor(Math.random() * 3), // 3~5
        comment: pick(REVIEW_TEMPLATES),
        createdAt: new Date(past.getTime() + 24 * 60 * 60 * 1000),
      },
    });
    reviewCount++;
    void consult;
  }
  console.log(`  상담 + 리뷰 ${reviewCount}건`);

  // ========== 8. 병원 rating / reviewCount 재집계 ==========
  console.log("\n🔄 병원 평점 재집계...");
  const allClinicIds = [...clinicIds, mainClinic.id];
  for (const cid of allClinicIds) {
    const agg = await prisma.review.aggregate({
      where: { clinicId: cid, deletedAt: null },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await prisma.clinic.update({
      where: { id: cid },
      data: {
        rating: agg._avg.rating ?? 0,
        reviewCount: agg._count._all,
      },
    });
  }

  console.log("\n=================================================");
  console.log("🔑 테스트 로그인 정보");
  console.log("=================================================");
  console.log("환자:    patient@test.com / test1234");
  console.log("의사:    dentist@test.com / test1234");
  console.log("관리자:  admin@test.com   / admin1234");
  console.log("");
  console.log("더미 환자: patient1~5@test.com / test1234");
  console.log("더미 의사: dentist1~3@test.com / test1234");
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
