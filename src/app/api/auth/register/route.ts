// 회원가입 API
// POST /api/auth/register

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { patientSignupSchema, dentistSignupSchema } from "@/lib/zod-schemas";
import { sendWelcomeEmail } from "@/lib/mailer";

const signupSchema = z.discriminatedUnion("role", [
  patientSignupSchema._def.schema,
  dentistSignupSchema._def.schema,
]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const hashedPassword = await bcrypt.hash(data.password, 10);

    if (data.role === "PATIENT") {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          phoneNumber: data.phoneNumber,
          role: "PATIENT",
          patient: {
            create: {
              birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
              gender: data.gender,
            },
          },
        },
        select: { id: true, email: true, name: true, role: true },
      });
      void sendWelcomeEmail({ to: user.email, name: user.name, role: "PATIENT" });
      return NextResponse.json(user, { status: 201 });
    }

    // DENTIST
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        phoneNumber: data.phoneNumber,
        role: "DENTIST",
        dentist: {
          create: {
            licenseNumber: data.licenseNumber,
            specialization: data.specialization,
            yearsOfExperience: data.yearsOfExperience,
          },
        },
      },
      select: { id: true, email: true, name: true, role: true },
    });
    void sendWelcomeEmail({ to: user.email, name: user.name, role: "DENTIST" });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        // unique 제약: email, phoneNumber, licenseNumber
        const target = (err.meta?.target as string[] | undefined)?.join(",") ?? "필드";
        return NextResponse.json(
          { error: "DUPLICATE", message: `이미 사용 중인 ${target} 입니다` },
          { status: 409 },
        );
      }
    }
    console.error("[register] error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "회원가입 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
