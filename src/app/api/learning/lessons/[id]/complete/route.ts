// 의사 술식 강의 완료
// POST /api/learning/lessons/:id/complete — 면허 인증 의사만. 과정을 다 마치면 온라인 이수 이력 자동 생성

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDentistAccess, notVerifiedResponse } from "@/lib/dentist-access";
import { completeLesson, LessonNotAvailable } from "@/lib/learning-server";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.user.role !== "DENTIST") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const access = await getDentistAccess(session.user.id);
  if (!access.isVerified) return notVerifiedResponse();

  try {
    const result = await completeLesson(session.user.id, params.id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LessonNotAvailable) {
      return NextResponse.json({ error: "NOT_FOUND", message: "볼 수 없는 강의입니다" }, { status: 404 });
    }
    throw err;
  }
}
