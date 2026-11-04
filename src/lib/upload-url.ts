// 업로드 파일 URL 규칙 (AWS SDK 없이 쓰는 순수 함수 — 테스트 대상)
//
// DB 에는 지금처럼 `https://{bucket}.s3.{region}.amazonaws.com/{key}` 형태로 저장한다.
// 화면에 보여줄 때는 이 URL 에서 key 를 꺼내 서명 URL 로 바꿔서 내보낸다(s3.ts 의 toViewUrl).
// 그래서 버킷을 비공개로 바꿔도 화면은 그대로 동작한다.

export const UPLOAD_PREFIX = "quotation-requests";

export function bucketBaseUrl(bucket: string, region: string): string {
  return `https://${bucket}.s3.${region}.amazonaws.com/`;
}

/** 업로드 key — 사용자별 폴더 아래에 둔다 */
export function buildUploadKey(userId: string, ext: string, now: number, uuid: string): string {
  return `${UPLOAD_PREFIX}/${userId}/${now}_${uuid}.${ext}`;
}

/** 우리 버킷 URL 이면 key 를, 아니면 null 을 돌려준다 */
export function keyFromStoredUrl(url: string, bucket: string, region: string): string | null {
  const base = bucketBaseUrl(bucket, region);
  if (!url.startsWith(base)) return null;
  const key = url.slice(base.length).split("?")[0];
  if (!key || key.includes("..")) return null;
  return decodeURIComponent(key);
}

/**
 * 이 사용자가 직접 올린 파일 URL 인지 확인.
 * 견적 요청 사진·채팅 이미지에 남이 올린 파일이나 외부 URL 을 끼워 넣지 못하게 막는다.
 */
export function isOwnUploadUrl(
  url: string,
  userId: string,
  bucket: string,
  region: string,
): boolean {
  const key = keyFromStoredUrl(url, bucket, region);
  if (!key) return false;
  return key.startsWith(`${UPLOAD_PREFIX}/${userId}/`);
}
