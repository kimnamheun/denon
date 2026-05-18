"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DayOfWeek =
  | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "MONDAY", label: "월" },
  { key: "TUESDAY", label: "화" },
  { key: "WEDNESDAY", label: "수" },
  { key: "THURSDAY", label: "목" },
  { key: "FRIDAY", label: "금" },
  { key: "SATURDAY", label: "토" },
  { key: "SUNDAY", label: "일" },
];

interface BusinessHour {
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface InitialData {
  name: string;
  phoneNumber: string;
  description: string;
  sido: string;
  sigungu: string;
  dong: string;
  detailAddress: string;
  latitude: number | null;
  longitude: number | null;
  hasParking: boolean;
  priceRange: string | null;
  implantBrands: string[];
  businessHours: BusinessHour[];
}

interface Props {
  clinicId: string;
  initial: InitialData;
}

export function ClinicEditForm({ clinicId, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [brandsInput, setBrandsInput] = useState(initial.implantBrands.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  function setBusinessHour(day: DayOfWeek, patch: Partial<BusinessHour>) {
    setForm((prev) => ({
      ...prev,
      businessHours: DAYS.map(({ key }) => {
        const existing = prev.businessHours.find((h) => h.dayOfWeek === key);
        if (key === day) {
          return {
            dayOfWeek: key,
            openTime: existing?.openTime ?? "09:00",
            closeTime: existing?.closeTime ?? "18:00",
            isClosed: existing?.isClosed ?? false,
            ...patch,
          };
        }
        return existing ?? {
          dayOfWeek: key,
          openTime: "09:00",
          closeTime: "18:00",
          isClosed: true,
        };
      }),
    }));
  }

  function getDay(day: DayOfWeek): BusinessHour {
    return (
      form.businessHours.find((h) => h.dayOfWeek === day) ?? {
        dayOfWeek: day,
        openTime: "09:00",
        closeTime: "18:00",
        isClosed: true,
      }
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedMsg(false);

    const implantBrands = brandsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phoneNumber: form.phoneNumber || undefined,
          description: form.description || undefined,
          sido: form.sido || undefined,
          sigungu: form.sigungu || undefined,
          dong: form.dong || undefined,
          detailAddress: form.detailAddress || undefined,
          latitude: form.latitude ?? undefined,
          longitude: form.longitude ?? undefined,
          hasParking: form.hasParking,
          priceRange: form.priceRange ?? undefined,
          implantBrands,
          businessHours: form.businessHours,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "저장 실패");
        return;
      }
      setSavedMsg(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="병원명"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Field
            label="전화번호"
            value={form.phoneNumber}
            onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
          />
          <div>
            <Label>병원 소개</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>주소 / 위치</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Field
              label="시/도"
              value={form.sido}
              onChange={(e) => setForm((p) => ({ ...p, sido: e.target.value }))}
            />
            <Field
              label="시/군/구"
              value={form.sigungu}
              onChange={(e) => setForm((p) => ({ ...p, sigungu: e.target.value }))}
            />
            <Field
              label="동"
              value={form.dong}
              onChange={(e) => setForm((p) => ({ ...p, dong: e.target.value }))}
            />
          </div>
          <Field
            label="상세 주소"
            value={form.detailAddress}
            onChange={(e) => setForm((p) => ({ ...p, detailAddress: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>위도</Label>
              <Input
                type="number"
                step="0.000001"
                value={form.latitude ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    latitude: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <Label>경도</Label>
              <Input
                type="number"
                step="0.000001"
                value={form.longitude ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    longitude: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>임플란트 브랜드 / 부가시설</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>임플란트 브랜드 (쉼표 구분)</Label>
            <Input
              value={brandsInput}
              onChange={(e) => setBrandsInput(e.target.value)}
              placeholder="오스템, 스트라우만, 노벨"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.hasParking}
              onChange={(e) => setForm((p) => ({ ...p, hasParking: e.target.checked }))}
            />
            <span className="text-sm">주차 가능</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>영업시간</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left">요일</th>
                <th>오픈</th>
                <th>마감</th>
                <th>휴진</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map(({ key, label }) => {
                const h = getDay(key);
                return (
                  <tr key={key} className="border-t">
                    <td className="py-2 font-medium">{label}</td>
                    <td>
                      <Input
                        type="time"
                        value={h.openTime}
                        onChange={(e) => setBusinessHour(key, { openTime: e.target.value })}
                        disabled={h.isClosed}
                      />
                    </td>
                    <td>
                      <Input
                        type="time"
                        value={h.closeTime}
                        onChange={(e) => setBusinessHour(key, { closeTime: e.target.value })}
                        disabled={h.isClosed}
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={h.isClosed}
                        onChange={(e) => setBusinessHour(key, { isClosed: e.target.checked })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
      )}
      {savedMsg && (
        <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md">저장되었습니다</div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
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
