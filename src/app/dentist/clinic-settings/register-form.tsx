"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export function ClinicRegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    businessNumber: "",
    phoneNumber: "",
    description: "",
    sido: "",
    sigungu: "",
    dong: "",
    detailAddress: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phoneNumber: form.phoneNumber || undefined,
          description: form.description || undefined,
          sido: form.sido || undefined,
          sigungu: form.sigungu || undefined,
          dong: form.dong || undefined,
          detailAddress: form.detailAddress || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "등록 실패");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="병원명 *" value={form.name} onChange={set("name")} required />
          <Field
            label="사업자번호 *"
            value={form.businessNumber}
            onChange={set("businessNumber")}
            required
            placeholder="123-45-67890"
          />
          <Field label="전화번호" value={form.phoneNumber} onChange={set("phoneNumber")} />

          <div className="grid grid-cols-3 gap-2">
            <Field label="시/도" value={form.sido} onChange={set("sido")} placeholder="서울" />
            <Field label="시/군/구" value={form.sigungu} onChange={set("sigungu")} placeholder="강남구" />
            <Field label="동" value={form.dong} onChange={set("dong")} placeholder="역삼동" />
          </div>

          <Field label="상세 주소" value={form.detailAddress} onChange={set("detailAddress")} />

          <div>
            <Label>병원 소개</Label>
            <Textarea value={form.description} onChange={set("description")} rows={4} />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "등록 중..." : "병원 등록"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label>{label}</Label>
      <Input {...rest} />
    </div>
  );
}
