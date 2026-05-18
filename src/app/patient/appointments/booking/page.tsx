"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// 시간 슬롯 (9:00 ~ 18:00, 30분 단위)
const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
  const h = 9 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export default function AppointmentBookingPage() {
  return (
    <Suspense fallback={<main className="container py-10">Loading...</main>}>
      <BookingForm />
    </Suspense>
  );
}

function BookingForm() {
  const router = useRouter();
  const params = useSearchParams();

  const clinicId = params.get("clinicId");
  const dentistId = params.get("dentistId");
  const quotationId = params.get("quotationId");

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clinicId || !dentistId) {
      setError("병원 또는 의사 정보가 부족합니다");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    setSubmitting(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          dentistId,
          quotationId: quotationId || undefined,
          scheduledAt,
          duration,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "예약 실패");
        return;
      }

      router.push("/patient/appointments");
    } finally {
      setSubmitting(false);
    }
  }

  if (!clinicId || !dentistId) {
    return (
      <main className="container py-10">
        <p className="text-destructive">병원/의사 정보가 누락되었습니다.</p>
      </main>
    );
  }

  return (
    <main className="container max-w-xl py-10">
      <h1 className="text-3xl font-bold mb-6">상담 예약</h1>

      <Card>
        <CardHeader>
          <CardTitle>예약 일정 선택</CardTitle>
          <CardDescription>희망하는 날짜와 시간을 선택해주세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="date">날짜</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>

            <div>
              <Label>시간</Label>
              <div className="grid grid-cols-5 gap-2 mt-1">
                {TIME_SLOTS.map((t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={t === time ? "default" : "outline"}
                    onClick={() => setTime(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="duration">예상 소요 시간 (분)</Label>
              <Input
                id="duration"
                type="number"
                min={15}
                step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="notes">메모 (선택)</Label>
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="추가로 전달할 사항이 있다면 입력하세요"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                취소
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "예약 중..." : "예약하기"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
