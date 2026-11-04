// AWS S3 - 사진 업로드 (Pre-signed URL 방식)
// 클라이언트 → 서버에 presign 요청 → 받은 URL 로 클라이언트가 직접 S3 PUT
// (Vercel Function 의 4.5MB body 제한 회피 + 대역폭 절약)
//
// 구강 사진은 건강정보(민감정보)라 버킷은 비공개로 두는 것을 전제로 한다.
// DB 에는 버킷 URL 을 그대로 저장하고, 화면에 보여줄 때 toViewUrl() 로 서명 URL 을 만든다.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

import { bucketBaseUrl, buildUploadKey, isOwnUploadUrl, keyFromStoredUrl } from "@/lib/upload-url";

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
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

// 보기용 서명 URL: 1시간 단위로 서명 시각을 고정해 같은 시간대에는 같은 URL 이 나오게 한다
// (브라우저 캐시가 먹도록). 유효기간 2시간 → 발급 후 최소 1시간은 열린다.
const VIEW_URL_WINDOW_MS = 60 * 60 * 1000;
const VIEW_URL_EXPIRES_SEC = 2 * 60 * 60;

export interface PresignedUploadUrl {
  url: string;
  key: string;
  /** DB 에 저장할 값 */
  publicUrl: string;
  /** 업로드 직후 미리보기용 서명 URL */
  viewUrl: string;
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
  const key = buildUploadKey(userId, ext, Date.now(), randomUUID());

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
  const publicUrl = `${bucketBaseUrl(S3_BUCKET, region)}${key}`;
  const viewUrl = await signViewKey(key);

  return { url, key, publicUrl, viewUrl };
}

async function signViewKey(key: string): Promise<string> {
  const signingDate = new Date(Math.floor(Date.now() / VIEW_URL_WINDOW_MS) * VIEW_URL_WINDOW_MS);
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), {
    expiresIn: VIEW_URL_EXPIRES_SEC,
    signingDate,
  });
}

/**
 * DB 에 저장된 URL → 화면에 보여줄 URL.
 * 우리 버킷 파일이면 서명 URL 로 바꾸고, 외부 URL(예: 병원 홍보 사진)은 그대로 둔다.
 */
export async function toViewUrl(stored: string): Promise<string>;
export async function toViewUrl(stored: string | null | undefined): Promise<string | null>;
export async function toViewUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  const key = keyFromStoredUrl(stored, S3_BUCKET, region);
  if (!key) return stored;
  try {
    return await signViewKey(key);
  } catch (err) {
    console.error("[s3] 보기용 URL 서명 실패:", err);
    return null;
  }
}

/** 여러 개를 한 번에 — 실패한 항목은 빈 문자열 */
export async function toViewUrls(stored: string[]): Promise<string[]> {
  return Promise.all(stored.map(async (u) => (await toViewUrl(u)) ?? ""));
}

/** 이 사용자가 올린 우리 버킷 파일인지 */
export function isOwnUpload(url: string, userId: string): boolean {
  return isOwnUploadUrl(url, userId, S3_BUCKET, region);
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
