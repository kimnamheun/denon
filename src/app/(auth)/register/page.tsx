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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      <div className="w-full max-w-md space-y-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">회원가입</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            가입 유형을 선택해주세요
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={role === "PATIENT" ? "default" : "outline"}
            onClick={() => setRole("PATIENT")}
          >
            환자
          </Button>
          <Button
            type="button"
            variant={role === "DENTIST" ? "default" : "outline"}
            onClick={() => setRole("DENTIST")}
          >
            치과
          </Button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
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

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "가입 중..." : "회원가입"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
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
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input {...rest} className="w-full h-10 px-3 rounded-md border border-input bg-background" />
    </div>
  );
}
