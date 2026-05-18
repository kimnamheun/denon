// 도메인 검증 스키마 (Zod)
// API 입력 검증 + react-hook-form 폼 검증에 공용 사용

import { z } from "zod";

// ============================================================
// Auth
// ============================================================

export const loginSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다"),
});
export type LoginInput = z.infer<typeof loginSchema>;

const phoneRegex = /^01[0-9]-?\d{3,4}-?\d{4}$/;

const baseSignupSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다")
    .regex(/[A-Za-z]/, "영문자 포함 필수")
    .regex(/[0-9]/, "숫자 포함 필수"),
  passwordConfirm: z.string(),
  name: z.string().min(1, "이름을 입력하세요").max(100),
  phoneNumber: z.string().regex(phoneRegex, "올바른 휴대폰 번호 형식이 아닙니다").optional(),
});

export const patientSignupSchema = baseSignupSchema
  .extend({
    role: z.literal("PATIENT"),
    birthDate: z.string().optional(), // YYYY-MM-DD
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["passwordConfirm"],
  });
export type PatientSignupInput = z.infer<typeof patientSignupSchema>;

export const dentistSignupSchema = baseSignupSchema
  .extend({
    role: z.literal("DENTIST"),
    licenseNumber: z.string().min(1, "면허번호를 입력하세요").max(50),
    specialization: z.string().min(1, "전공/전문분야를 입력하세요").max(100),
    yearsOfExperience: z.number().int().min(0).optional(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["passwordConfirm"],
  });
export type DentistSignupInput = z.infer<typeof dentistSignupSchema>;

// ============================================================
// Quotation
// ============================================================

export const quotationRequestSchema = z.object({
  symptoms: z.string().min(1, "증상을 입력하세요"),
  previousTreatment: z.string().optional(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]),
  minBudget: z.number().int().nonnegative().optional(),
  maxBudget: z.number().int().nonnegative().optional(),
  preferredImplantBrand: z.string().max(50).optional(),
  preferredHospitalType: z.string().max(50).optional(),
  additionalNotes: z.string().optional(),
  missingTeeth: z.array(z.string()).default([]),
  photoUrls: z.array(z.string().url()).default([]),
});
export type QuotationRequestInput = z.infer<typeof quotationRequestSchema>;

const implantItemSchema = z.object({
  toothNumber: z.string().min(1).max(10),
  brand: z.string().min(1).max(50),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().int().nonnegative(),
});

const additionalItemSchema = z.object({
  description: z.string().min(1),
  price: z.number().int().nonnegative(),
});

const consultationScheduleSchema = z.object({
  consultationDate: z.string(), // YYYY-MM-DD
  consultationTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM 형식"),
  duration: z.number().int().positive().default(60),
});

export const quotationCreateSchema = z.object({
  quotationRequestId: z.string().min(1),
  treatmentPlan: z.string().min(1),
  implantItems: z.array(implantItemSchema).min(1, "최소 1개 임플란트 아이템 필요"),
  additionalItems: z.array(additionalItemSchema).default([]),
  consultationSchedules: z.array(consultationScheduleSchema).default([]),
  discountRate: z.number().int().min(0).max(100).default(0),
  treatmentDuration: z.number().int().positive(),
  warrantyPeriod: z.number().int().nonnegative(),
  validUntil: z.string(), // YYYY-MM-DD
  additionalNotes: z.string().optional(),
});
export type QuotationCreateInput = z.infer<typeof quotationCreateSchema>;

// ============================================================
// Consultation / Review
// ============================================================

export const consultationCreateSchema = z.object({
  dentistId: z.string().min(1),
  clinicId: z.string().min(1),
  quotationId: z.string().optional(),
  scheduledAt: z.string().datetime(),
  duration: z.number().int().positive().default(60),
  notes: z.string().optional(),
});
export type ConsultationCreateInput = z.infer<typeof consultationCreateSchema>;

export const reviewCreateSchema = z.object({
  dentistId: z.string().min(1),
  clinicId: z.string().min(1),
  quotationId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;

// ============================================================
// Clinic search
// ============================================================

export const clinicSearchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().positive().max(50).default(5), // km
  implantBrand: z.string().optional(),
  priceRange: z.enum(["LOW", "MEDIUM", "HIGH", "PREMIUM"]).optional(),
  isPremium: z.boolean().optional(),
});
export type ClinicSearchInput = z.infer<typeof clinicSearchSchema>;
