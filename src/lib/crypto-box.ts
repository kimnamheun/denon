// 서버 보관용 암호화 (AES-256-GCM) — 카드 자동결제 billingKey 처럼 DB 에 그대로 두면 안 되는 값
//
// 키: 환경변수 BILLING_KEY_SECRET (32바이트를 base64 로). 생성: openssl rand -base64 32
// 형식: "v1.<iv>.<tag>.<암호문>" (모두 base64url)

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function loadKey(secret: string | undefined): Buffer {
  if (!secret) throw new Error("BILLING_KEY_SECRET 이 설정되지 않았습니다");
  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) throw new Error("BILLING_KEY_SECRET 은 32바이트(base64)여야 합니다");
  return key;
}

export function sealSecret(plain: string, secret: string | undefined = process.env.BILLING_KEY_SECRET): string {
  const key = loadKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

export function openSecret(sealed: string, secret: string | undefined = process.env.BILLING_KEY_SECRET): string {
  const key = loadKey(secret);
  const [v, ivB, tagB, encB] = sealed.split(".");
  if (v !== "v1" || !ivB || !tagB || !encB) throw new Error("알 수 없는 암호문 형식");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encB, "base64url")), decipher.final()]).toString("utf8");
}

export function canSealSecrets(secret: string | undefined = process.env.BILLING_KEY_SECRET): boolean {
  try {
    loadKey(secret);
    return true;
  } catch {
    return false;
  }
}
