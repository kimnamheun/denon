// 클라이언트측 파일 업로드 유틸
// 1) 서버에서 presigned URL 발급
// 2) 받은 URL 로 직접 S3 PUT
// 3) publicUrl 반환

export interface UploadResult {
  publicUrl: string;
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

  const { url, key, publicUrl } = (await presignRes.json()) as {
    url: string;
    key: string;
    publicUrl: string;
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

  return { publicUrl, key };
}
