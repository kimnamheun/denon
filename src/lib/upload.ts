// 클라이언트측 파일 업로드 유틸
// 1) 서버에서 presigned URL 발급
// 2) 받은 URL 로 직접 S3 PUT
// 3) publicUrl(DB 저장용) + viewUrl(미리보기용 서명 URL) 반환

export interface UploadResult {
  /** 서버에 보낼 값 (DB 저장용) */
  publicUrl: string;
  /** 화면 미리보기용 — 버킷이 비공개여도 열린다 */
  viewUrl: string;
  key: string;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  // 1. presigned URL 발급
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: file.type,
      contentLength: file.size,
    }),
  });

  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}));
    throw new Error(err.message ?? "Presign 실패");
  }

  const { url, key, publicUrl, viewUrl } = (await presignRes.json()) as {
    url: string;
    key: string;
    publicUrl: string;
    viewUrl: string;
  };

  // 2. S3 직접 PUT
  const putRes = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`S3 업로드 실패 (${putRes.status})`);
  }

  return { publicUrl, viewUrl, key };
}
