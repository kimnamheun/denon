import { describe, it, expect } from "vitest";

import {
  loginSchema,
  patientSignupSchema,
  dentistSignupSchema,
  quotationRequestSchema,
  quotationCreateSchema,
  reviewCreateSchema,
} from "../zod-schemas";

describe("loginSchema", () => {
  it("이메일/비밀번호 모두 있으면 통과", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "12345678" }).success).toBe(true);
  });
  it("8자 미만 비밀번호 거부", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "short" }).success).toBe(false);
  });
  it("잘못된 이메일 거부", () => {
    expect(loginSchema.safeParse({ email: "not-email", password: "12345678" }).success).toBe(false);
  });
});

describe("patientSignupSchema", () => {
  const valid = {
    role: "PATIENT" as const,
    email: "p@b.com",
    password: "abcd1234",
    passwordConfirm: "abcd1234",
    name: "환자A",
  };
  it("정상 입력 통과", () => {
    expect(patientSignupSchema.safeParse(valid).success).toBe(true);
  });
  it("비밀번호 불일치 거부", () => {
    expect(
      patientSignupSchema.safeParse({ ...valid, passwordConfirm: "different1" }).success,
    ).toBe(false);
  });
  it("영문자/숫자 미포함 거부", () => {
    const r = patientSignupSchema.safeParse({
      ...valid,
      password: "aaaaaaaa", // 숫자 없음
      passwordConfirm: "aaaaaaaa",
    });
    expect(r.success).toBe(false);
  });
});

describe("dentistSignupSchema", () => {
  const valid = {
    role: "DENTIST" as const,
    email: "d@b.com",
    password: "abcd1234",
    passwordConfirm: "abcd1234",
    name: "Dr. K",
    licenseNumber: "LIC-12345",
    specialization: "임플란트",
  };
  it("정상 통과", () => {
    expect(dentistSignupSchema.safeParse(valid).success).toBe(true);
  });
  it("licenseNumber 누락 거부", () => {
    const { licenseNumber: _u, ...rest } = valid;
    void _u;
    expect(dentistSignupSchema.safeParse(rest).success).toBe(false);
  });
});

describe("quotationRequestSchema", () => {
  it("기본값 적용 (missingTeeth, photoUrls 기본 빈 배열)", () => {
    const r = quotationRequestSchema.safeParse({
      symptoms: "통증",
      urgency: "HIGH",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.missingTeeth).toEqual([]);
      expect(r.data.photoUrls).toEqual([]);
    }
  });
  it("symptoms 누락 거부", () => {
    expect(quotationRequestSchema.safeParse({ urgency: "LOW" }).success).toBe(false);
  });
  it("음수 예산 거부", () => {
    expect(
      quotationRequestSchema.safeParse({
        symptoms: "x",
        urgency: "LOW",
        minBudget: -1000,
      }).success,
    ).toBe(false);
  });
});

describe("quotationCreateSchema", () => {
  const valid = {
    quotationRequestId: "req-1",
    treatmentPlan: "임플란트 치료 계획",
    implantItems: [
      {
        toothNumber: "11",
        brand: "오스템",
        quantity: 1,
        unitPrice: 1500000,
      },
    ],
    treatmentDuration: 3,
    warrantyPeriod: 5,
    validUntil: "2026-12-31",
  };
  it("최소 정상 입력 통과", () => {
    expect(quotationCreateSchema.safeParse(valid).success).toBe(true);
  });
  it("임플란트 아이템 0개 거부", () => {
    expect(
      quotationCreateSchema.safeParse({ ...valid, implantItems: [] }).success,
    ).toBe(false);
  });
  it("100% 초과 할인율 거부", () => {
    expect(
      quotationCreateSchema.safeParse({ ...valid, discountRate: 150 }).success,
    ).toBe(false);
  });
});

describe("reviewCreateSchema", () => {
  it("rating 1~5 통과", () => {
    for (let r = 1; r <= 5; r++) {
      expect(
        reviewCreateSchema.safeParse({
          dentistId: "d1",
          clinicId: "c1",
          rating: r,
        }).success,
      ).toBe(true);
    }
  });
  it("rating 0 또는 6 거부", () => {
    expect(
      reviewCreateSchema.safeParse({ dentistId: "d1", clinicId: "c1", rating: 0 }).success,
    ).toBe(false);
    expect(
      reviewCreateSchema.safeParse({ dentistId: "d1", clinicId: "c1", rating: 6 }).success,
    ).toBe(false);
  });
});
