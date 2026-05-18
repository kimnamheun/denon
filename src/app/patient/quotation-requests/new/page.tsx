"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToothSelector } from "@/components/tooth-selector";
import { uploadFile } from "@/lib/upload";

type Urgency = "LOW" | "MEDIUM" | "HIGH";

export default function NewQuotationRequestPage() {
  const router = useRouter();

  const [symptoms, setSymptoms] = useState("");
  const [previousTreatment, setPreviousTreatment] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("MEDIUM");
  const [minBudget, setMinBudget] = useState<string>("");
  const [maxBudget, setMaxBudget] = useState<string>("");
  const [preferredImplantBrand, setPreferredImplantBrand] = useState("");
  const [preferredHospitalType, setPreferredHospitalType] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [missingTeeth, setMissingTeeth] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(files.map((f) => uploadFile(f)));
      setPhotoUrls((prev) => [...prev, ...uploaded.map((u) => u.publicUrl)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      e.target.value = ""; // reset
    }
  }

  function removePhoto(url: string) {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (missingTeeth.length === 0) {
      setError("최소 1개 이상의 치아를 선택해주세요");
      return;
    }
    if (!symptoms.trim()) {
      setError("증상을 입력해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/quotation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms,
          previousTreatment: previousTreatment || undefined,
          urgency,
          minBudget: minBudget ? Number(minBudget) : undefined,
          maxBudget: maxBudget ? Number(maxBudget) : undefined,
          preferredImplantBrand: preferredImplantBrand || undefined,
          preferredHospitalType: preferredHospitalType || undefined,
          additionalNotes: additionalNotes || undefined,
          missingTeeth,
          photoUrls,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "견적 요청 생성 실패");
        return;
      }

      router.push("/patient/quotation-requests");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container max-w-3xl py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">새 견적 요청</h1>
        <p className="text-muted-foreground mt-2">
          증상과 치아 상태를 입력하면 여러 치과에서 견적을 받을 수 있습니다.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. 치아 상태</CardTitle>
            <CardDescription>임플란트가 필요한 치아를 선택하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <ToothSelector value={missingTeeth} onChange={setMissingTeeth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. 증상 및 치료 이력</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="symptoms">증상 *</Label>
              <Textarea
                id="symptoms"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="현재 증상을 자세히 설명해주세요"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="previousTreatment">기존 치료 이력</Label>
              <Textarea
                id="previousTreatment"
                value={previousTreatment}
                onChange={(e) => setPreviousTreatment(e.target.value)}
                placeholder="과거 받은 치과 치료가 있다면 입력하세요"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. 사진 첨부 (선택)</CardTitle>
            <CardDescription>구강 사진을 첨부하면 더 정확한 견적을 받을 수 있습니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={onFileChange}
              disabled={uploading}
            />
            {uploading && <p className="text-sm text-muted-foreground">업로드 중...</p>}
            {photoUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photoUrls.map((url) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="첨부 사진" className="w-full h-24 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      aria-label="삭제"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. 추가 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>긴급도 *</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as Urgency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">여유롭게 (1개월 이상)</SelectItem>
                  <SelectItem value="MEDIUM">보통 (2주 이내)</SelectItem>
                  <SelectItem value="HIGH">시급 (1주 이내)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="minBudget">최소 예산 (원)</Label>
                <Input
                  id="minBudget"
                  type="number"
                  min="0"
                  step="10000"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                  placeholder="예: 1000000"
                />
              </div>
              <div>
                <Label htmlFor="maxBudget">최대 예산 (원)</Label>
                <Input
                  id="maxBudget"
                  type="number"
                  min="0"
                  step="10000"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  placeholder="예: 3000000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="brand">선호 임플란트 브랜드</Label>
              <Input
                id="brand"
                value={preferredImplantBrand}
                onChange={(e) => setPreferredImplantBrand(e.target.value)}
                placeholder="예: 오스템, 스트라우만, 노벨 등"
              />
            </div>

            <div>
              <Label htmlFor="hospitalType">선호 병원 유형</Label>
              <Input
                id="hospitalType"
                value={preferredHospitalType}
                onChange={(e) => setPreferredHospitalType(e.target.value)}
                placeholder="예: 개인치과, 대학병원 등"
              />
            </div>

            <div>
              <Label htmlFor="notes">기타 요청사항</Label>
              <Textarea
                id="notes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" disabled={submitting || uploading}>
            {submitting ? "제출 중..." : "견적 요청"}
          </Button>
        </div>
      </form>
    </main>
  );
}
