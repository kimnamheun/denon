"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type Role = "PATIENT" | "DENTIST";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("PATIENT");
  const [form, setForm] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    name: "",
    phoneNumber: "",
    licenseNumber: "",
    specialization: "",
  });
  const [consents, setConsents] = useState({
    terms: false,
    privacy: false,
    medicalDisclosure: false, // 환자 전용 — 견적 요청 익명화 공개 동의
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const requiredConsents = role === "PATIENT"
    ? consents.terms && consents.privacy && consents.medicalDisclosure
    : consents.terms && consents.privacy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!requiredConsents) {
      setError("필수 약관에 모두 동의해주세요.");
      return;
    }

    setLoading(true);

    const payload: Record<string, unknown> = {
      role,
      email: form.email,
      password: form.password,
      passwordConfirm: form.passwordConfirm,
      name: form.name,
      phoneNumber: form.phoneNumber || undefined,
    };
    if (role === "DENTIST") {
      payload.licenseNumber = form.licenseNumber;
      payload.specialization = form.specialization;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "회원가입 실패");
        return;
      }
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold">회원가입</h1>
          <p className="text-muted-foreground mt-3 text-base">
            가입 유형을 선택해주세요
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            size="lg"
            variant={role === "PATIENT" ? "default" : "outline"}
            onClick={() => setRole("PATIENT")}
          >
            환자
          </Button>
          <Button
            type="button"
            size="lg"
            variant={role === "DENTIST" ? "default" : "outline"}
            onClick={() => setRole("DENTIST")}
          >
            치과
          </Button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="이메일" type="email" value={form.email} onChange={update("email")} required />
          <Field label="비밀번호" type="password" value={form.password} onChange={update("password")} required minLength={8} />
          <Field label="비밀번호 확인" type="password" value={form.passwordConfirm} onChange={update("passwordConfirm")} required minLength={8} />
          <Field label="이름" value={form.name} onChange={update("name")} required maxLength={100} />
          <Field label="휴대폰 번호" placeholder="010-0000-0000" value={form.phoneNumber} onChange={update("phoneNumber")} />

          {role === "DENTIST" && (
            <>
              <Field label="치과의사 면허번호" value={form.licenseNumber} onChange={update("licenseNumber")} required />
              <Field label="전문 분야" placeholder="예: 임플란트, 보철" value={form.specialization} onChange={update("specialization")} required />
            </>
          )}

          {/* 약관 동의 — 노년 친화: 큰 체크박스, 본문 폰트 */}
          <div className="border-2 rounded-xl p-4 space-y-3 bg-muted/30">
            <p className="text-base font-bold">약관 동의 (필수)</p>

            <label className="flex items-start gap-3 text-base cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5"
                checked={consents.terms}
                onChange={(e) => setConsents((p) => ({ ...p, terms: e.target.checked }))}
              />
              <span className="flex-1">
                [필수]{" "}
                <Link href="/terms" target="_blank" className="text-primary font-semibold hover:underline">
                  이용약관
                </Link>
                에 동의합니다
              </span>
            </label>

            <label className="flex items-start gap-3 text-base cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5"
                checked={consents.privacy}
                onChange={(e) => setConsents((p) => ({ ...p, privacy: e.target.checked }))}
              />
              <span className="flex-1">
                [필수]{" "}
                <Link href="/privacy" target="_blank" className="text-primary font-semibold hover:underline">
                  개인정보처리방침
                </Link>
                에 동의합니다 (민감정보 의료기록 포함)
              </span>
            </label>

            {role === "PATIENT" && (
              <label className="flex items-start gap-3 text-base cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                  checked={consents.medicalDisclosure}
                  onChange={(e) => setConsents((p) => ({ ...p, medicalDisclosure: e.target.checked }))}
                />
                <span className="flex-1">
                  [필수] 견적 요청 정보(치아 위치, 증상, 사진)가 <strong>익명화되어</strong>{" "}
                  제휴 의료기관에 공개되어 견적 회신을 받는 것에 동의합니다
                </span>
              </label>
            )}

            <p className="text-sm text-muted-foreground pt-2 border-t">
              본 플랫폼은 의료기관·의료인과 별개의 정보 제공 서비스이며,
              의료법 제27조에서 금지하는 환자 알선·유인 행위를 수행하지 않습니다.
            </p>
          </div>

          {error && (
            <div className="text-base text-destructive bg-destructive/10 p-4 rounded-lg font-medium">{error}</div>
          )}

          <Button type="submit" size="lg" disabled={loading || !requiredConsents} className="w-full">
            {loading ? "가입 중..." : "회원가입"}
          </Button>
        </form>

        <div className="text-center text-base text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">
            로그인
          </Link>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-base font-semibold mb-2">{label}</label>
      <input {...rest} className="w-full h-12 px-4 rounded-lg border-2 border-input bg-background text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </div>
  );
}
