// AWS S3 - 사진 업로드 (Pre-signed URL 방식)
// 클라이언트 → 서버에 presign 요청 → 받은 URL 로 클라이언트가 직접 S3 PUT
// (Vercel Function 의 4.5MB body 제한 회피 + 대역폭 절약)

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const region = process.env.AWS_REGION ?? "ap-northeast-2";
export const S3_BUCKET = process.env.AWS_S3_BUCKET ?? "dental-platform-bucket";

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export interface PresignedUploadUrl {
  url: string;
  key: string;
  publicUrl: string;
}

/**
 * 업로드용 presigned URL 발급 (5분 유효)
 *
 * @param userId 사용자 ID (경로 prefix 로 사용)
 * @param contentType MIME 타입
 * @param contentLength byte 길이
 */
export async function createPresignedUploadUrl(
  userId: string,
  contentType: string,
  contentLength: number,
): Promise<PresignedUploadUrl> {
  if (!ALLOWED_MIME.has(contentType)) {
    throw new Error(`허용되지 않은 MIME: ${contentType}`);
  }
  if (contentLength > MAX_BYTES) {
    throw new Error(`파일이 너무 큼 (최대 10MB)`);
  }

  const ext = contentType.split("/")[1] ?? "bin";
  const key = `quotation-requests/${userId}/${Date.now()}_${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
  const publicUrl = `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;

  return { url, key, publicUrl };
}

/** S3 오브젝트 삭제 */
export async function deleteObject(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    }),
  );
}
