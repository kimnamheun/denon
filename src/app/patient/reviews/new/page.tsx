"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function NewReviewPage() {
  return (
    <Suspense fallback={<main className="container py-10">Loading...</main>}>
      <ReviewForm />
    </Suspense>
  );
}

interface ConsultationData {
  id: string;
  status: string;
  dentistId: string;
  clinicId: string;
  quotationId: string | null;
  clinic: { name: string };
  dentist: { user: { name: string } };
}

function ReviewForm() {
  const router = useRouter();
  const params = useSearchParams();
  const consultationId = params.get("consultationId");

  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!consultationId) return;
    void fetch(`/api/consultations/${consultationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setConsultation(data));
  }, [consultationId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consultation) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dentistId: consultation.dentistId,
          clinicId: consultation.clinicId,
          quotationId: consultation.quotationId,
          rating,
          comment: comment || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "리뷰 작성 실패");
        return;
      }
      router.push("/patient/appointments");
    } finally {
      setSubmitting(false);
    }
  }

  if (!consultationId) {
    return (
      <main className="container py-10">
        <p className="text-destructive">상담 ID 가 누락되었습니다</p>
      </main>
    );
  }

  return (
    <main className="container max-w-xl py-10">
      <h1 className="text-3xl font-bold mb-6">리뷰 작성</h1>

      <Card>
        <CardHeader>
          <CardTitle>{consultation?.clinic.name ?? "병원"}</CardTitle>
          <CardDescription>{consultation?.dentist.user.name} 원장</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>별점</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    aria-label={`${n}점`}
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        n <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground",
                      )}
                    />
                  </button>
                ))}
              </div>
              <p className="text-base text-muted-foreground mt-1">{rating} / 5</p>
            </div>

            <div>
              <Label htmlFor="comment">리뷰 내용</Label>
              <Textarea
                id="comment"
                rows={6}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="치료 경험을 자유롭게 작성해주세요"
              />
            </div>

            {error && (
              <div className="text-base text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                취소
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "제출 중..." : "리뷰 등록"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
