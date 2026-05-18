// S3 업로드용 Presigned URL 발급
// POST /api/upload/presign  { contentType, contentLength }
// 응답: { url, key, publicUrl }
//
// 클라이언트는 받은 url 로 직접 S3 PUT → publicUrl 을 폼에 저장.
// 인증 필수 (PATIENT 만 일단 허용; DENTIST 도 추후 견적서 첨부 시 필요)

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { createPresignedUploadUrl } from "@/lib/s3";

const bodySchema = z.object({
  contentType: z.string().min(1),
  contentLength: z.number().int().positive(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await createPresignedUploadUrl(
      session.user.id,
      parsed.data.contentType,
      parsed.data.contentLength,
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "PRESIGN_FAILED", message: err instanceof Error ? err.message : "unknown" },
      { status: 400 },
    );
  }
}
