"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ToggleGroup } from "@/components/ui/toggle-group";
import {
  ADDITIONAL_ITEM_PRESETS,
  DENTIST_IMPLANT_BRANDS,
  DISCOUNT_OPTIONS,
  TREATMENT_DURATION_OPTIONS,
  TREATMENT_PLAN_TAGS,
  VALID_UNTIL_OPTIONS,
  WARRANTY_OPTIONS,
  addDaysISO,
} from "@/lib/constants/quotation-form-options";

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<main className="container py-10">Loading...</main>}>
      <NewQuotationForm />
    </Suspense>
  );
}

interface ImplantItem {
  toothNumber: string;
  brand: string;
  quantity: number;
  unitPrice: number;
}

interface AdditionalItem {
  description: string;
  price: number;
}

interface RequestData {
  id: string;
  missingTeeth: { toothNumber: string }[];
  symptoms?: string | null;
}

function NewQuotationForm() {
  const router = useRouter();
  const params = useSearchParams();
  const requestId = params.get("requestId");

  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [implantItems, setImplantItems] = useState<ImplantItem[]>([]);
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([]);
  const [discountRate, setDiscountRate] = useState(0);
  const [treatmentDuration, setTreatmentDuration] = useState(3);
  const [warrantyPeriod, setWarrantyPeriod] = useState(5);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [treatmentTags, setTreatmentTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 선택된 시술 태그 라벨 (요약 표시 + 합치기용)
  const treatmentTagLabels = useMemo(() => {
    return treatmentTags
      .map((v) => TREATMENT_PLAN_TAGS.find((t) => t.value === v)?.label)
      .filter((l): l is string => Boolean(l));
  }, [treatmentTags]);

  useEffect(() => {
    if (!requestId) return;
    void fetch(`/api/quotation-requests/${requestId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: RequestData | null) => {
        if (data) {
          setRequestData(data);
          // 누락치아를 기반으로 임플란트 아이템 초기 생성
          setImplantItems(
            data.missingTeeth.map((t) => ({
              toothNumber: t.toothNumber,
              brand: "",
              quantity: 1,
              unitPrice: 0,
            })),
          );
        }
      });
  }, [requestId]);

  const implantTotal = implantItems.reduce(
    (sum, it) => sum + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0),
    0,
  );
  const additionalTotal = additionalItems.reduce(
    (sum, it) => sum + (Number(it.price) || 0),
    0,
  );
  const totalAmount = implantTotal + additionalTotal;
  const discountAmount = Math.floor((totalAmount * discountRate) / 100);
  const finalAmount = totalAmount - discountAmount;

  function updateImplant(idx: number, patch: Partial<ImplantItem>) {
    setImplantItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeImplant(idx: number) {
    setImplantItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addImplant() {
    setImplantItems((prev) => [
      ...prev,
      { toothNumber: "", brand: "", quantity: 1, unitPrice: 0 },
    ]);
  }

  function updateAdditional(idx: number, patch: Partial<AdditionalItem>) {
    setAdditionalItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeAdditional(idx: number) {
    setAdditionalItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addAdditional() {
    setAdditionalItems((prev) => [...prev, { description: "", price: 0 }]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!requestId) {
      setError("견적 요청 ID가 없습니다");
      return;
    }
    // 치료 계획: 선택된 시술 태그 + 자유 입력 합치기
    const combinedPlan = [
      treatmentTagLabels.join(" · "),
      treatmentPlan.trim(),
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!combinedPlan) {
      setError("치료 계획을 입력해주세요 (시술 선택 또는 직접 입력)");
      return;
    }
    if (implantItems.length === 0) {
      setError("최소 1개의 임플란트 아이템이 필요합니다");
      return;
    }
    if (implantItems.some((it) => !it.toothNumber || !it.brand || it.unitPrice <= 0)) {
      setError("모든 임플란트 아이템의 치아번호/브랜드/단가를 입력해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotationRequestId: requestId,
          treatmentPlan: combinedPlan,
          implantItems: implantItems.map((it) => ({
            toothNumber: it.toothNumber,
            brand: it.brand,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
          })),
          additionalItems: additionalItems
            .filter((it) => it.description.trim() && it.price > 0)
            .map((it) => ({
              description: it.description,
              price: Number(it.price),
            })),
          consultationSchedules: [],
          discountRate: Number(discountRate),
          treatmentDuration: Number(treatmentDuration),
          warrantyPeriod: Number(warrantyPeriod),
          validUntil,
          additionalNotes: additionalNotes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "견적서 작성 실패");
        return;
      }

      router.push("/dentist/quotations/submitted");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!requestId) {
    return (
      <main className="container py-10">
        <p className="text-destructive">견적 요청 ID가 필요합니다.</p>
      </main>
    );
  }

  return (
    <main className="container max-w-3xl py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">견적서 작성</h1>
        {requestData && (
          <p className="text-muted-foreground mt-2">
            요청 치아: {requestData.missingTeeth.map((t) => t.toothNumber).join(", ")}
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. 치료 계획</CardTitle>
            <CardDescription>해당되는 시술을 모두 선택하고, 필요하면 아래에 상세 설명을 추가하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleGroup
              multi
              options={TREATMENT_PLAN_TAGS}
              value={treatmentTags}
              onChange={setTreatmentTags}
            />
            <div>
              <Label htmlFor="treatmentPlanFreeText">상세 설명 (선택)</Label>
              <Textarea
                id="treatmentPlanFreeText"
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                placeholder="예: 발치 후 3개월 치유 기간을 거쳐 임플란트 식립 진행 예정"
                rows={4}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>2. 임플란트 항목</CardTitle>
                <CardDescription>치아별 임플란트 정보</CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addImplant}>
                <Plus className="h-4 w-4 mr-1" /> 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {implantItems.map((item, idx) => (
              <div key={idx} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Label className="text-sm">치아번호</Label>
                      <Input
                        value={item.toothNumber}
                        onChange={(e) => updateImplant(idx, { toothNumber: e.target.value })}
                        placeholder="11"
                      />
                    </div>
                    <div className="col-span-5">
                      <Label className="text-sm">수량</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => updateImplant(idx, { quantity: Math.max(1, item.quantity - 1) })}
                          aria-label="수량 감소"
                          className="shrink-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateImplant(idx, { quantity: Number(e.target.value) })}
                          className="text-center"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => updateImplant(idx, { quantity: item.quantity + 1 })}
                          aria-label="수량 증가"
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="col-span-4">
                      <Label className="text-sm">단가 (원)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={10000}
                        value={item.unitPrice}
                        onChange={(e) => updateImplant(idx, { unitPrice: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeImplant(idx)}
                    aria-label="삭제"
                    className="shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* 브랜드 — 빠른 선택 버튼들 + 직접 입력 */}
                <div>
                  <Label className="text-sm">브랜드</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {DENTIST_IMPLANT_BRANDS.map((b) => {
                      const selected = item.brand === b.value;
                      return (
                        <button
                          key={b.value}
                          type="button"
                          onClick={() => updateImplant(idx, { brand: selected ? "" : b.value })}
                          aria-pressed={selected}
                          className={`h-10 px-3 rounded-md border-2 text-base font-medium transition-colors ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-input hover:bg-muted"
                          }`}
                        >
                          {b.value}
                          <span className="ml-1 text-xs opacity-70">({b.detail})</span>
                        </button>
                      );
                    })}
                  </div>
                  <Input
                    value={item.brand}
                    onChange={(e) => updateImplant(idx, { brand: e.target.value })}
                    placeholder="직접 입력하거나 위 브랜드를 선택하세요"
                    className="mt-2"
                  />
                </div>

                <div className="text-right text-sm text-muted-foreground border-t pt-2">
                  소계: <span className="font-semibold text-foreground">
                    {((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)).toLocaleString("ko-KR")}원
                  </span>
                </div>
              </div>
            ))}
            <div className="text-right text-base pt-2 border-t">
              임플란트 합계: <span className="font-semibold">{implantTotal.toLocaleString("ko-KR")}원</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>3. 추가 항목</CardTitle>
                <CardDescription>자주 추가하는 항목을 한 번 클릭으로 추가</CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addAdditional}>
                <Plus className="h-4 w-4 mr-1" /> 빈 항목 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 자주 추가 preset 빠른 버튼 */}
            <div>
              <Label className="text-sm">자주 추가하는 항목</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ADDITIONAL_ITEM_PRESETS.map((preset) => {
                  const already = additionalItems.some((it) => it.description === preset.description);
                  return (
                    <button
                      key={preset.description}
                      type="button"
                      disabled={already}
                      onClick={() =>
                        setAdditionalItems((prev) => [
                          ...prev,
                          { description: preset.description, price: preset.price },
                        ])
                      }
                      className={`h-10 px-3 rounded-md border-2 text-base font-medium transition-colors ${
                        already
                          ? "bg-muted text-muted-foreground border-input cursor-not-allowed opacity-60"
                          : "bg-background border-input hover:border-primary hover:bg-muted"
                      }`}
                    >
                      {already ? "✓ " : "+ "}{preset.description}
                      <span className="ml-1 text-xs opacity-70">
                        {preset.price.toLocaleString("ko-KR")}원
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {additionalItems.length === 0 && (
              <p className="text-base text-muted-foreground text-center py-4 border-t">
                추가 항목이 없습니다. 위에서 빠른 추가하거나 &lsquo;빈 항목 추가&rsquo; 를 누르세요.
              </p>
            )}
            {additionalItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end border-t pt-3">
                <div className="col-span-8">
                  <Label className="text-sm">내용</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateAdditional(idx, { description: e.target.value })}
                    placeholder="예: 본 이식술"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-sm">금액 (원)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={10000}
                    value={item.price}
                    onChange={(e) => updateAdditional(idx, { price: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeAdditional(idx)}
                    aria-label="삭제"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. 조건 / 합계</CardTitle>
            <CardDescription>아래에서 빠르게 선택하거나 필요하면 직접 입력</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>치료 기간</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TREATMENT_DURATION_OPTIONS.map((opt) => {
                  const selected = treatmentDuration === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTreatmentDuration(opt.value)}
                      aria-pressed={selected}
                      className={`h-11 px-4 rounded-md border-2 text-base font-medium transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>보증 기간</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WARRANTY_OPTIONS.map((opt) => {
                  const selected = warrantyPeriod === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setWarrantyPeriod(opt.value)}
                      aria-pressed={selected}
                      className={`h-11 px-4 rounded-md border-2 text-base font-medium transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>할인율</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DISCOUNT_OPTIONS.map((opt) => {
                  const selected = discountRate === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDiscountRate(opt.value)}
                      aria-pressed={selected}
                      className={`h-11 px-4 rounded-md border-2 text-base font-medium transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>유효기간 (오늘 기준)</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {VALID_UNTIL_OPTIONS.map((opt) => {
                  const iso = addDaysISO(opt.days);
                  const selected = validUntil === iso;
                  return (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setValidUntil(iso)}
                      aria-pressed={selected}
                      className={`h-11 px-4 rounded-md border-2 text-base font-medium transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-muted"
                      }`}
                    >
                      {opt.label} 후
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">선택된 만료일: {validUntil}</p>
            </div>

            <div>
              <Label>추가 메모 (선택)</Label>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="환자분께 전달하고 싶은 추가 안내 사항"
                rows={3}
              />
            </div>

            <div className="border rounded-md p-4 space-y-1 bg-muted/40">
              <Row label="임플란트 합계" value={implantTotal} />
              <Row label="추가 항목 합계" value={additionalTotal} />
              <Row label="총액" value={totalAmount} />
              <Row label={`할인 (${discountRate}%)`} value={-discountAmount} />
              <div className="border-t mt-2 pt-2 flex justify-between font-bold text-lg">
                <span>최종 금액</span>
                <span>{finalAmount.toLocaleString("ko-KR")}원</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="text-base text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "제출 중..." : "견적서 제출"}
          </Button>
        </div>
      </form>
    </main>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-base">
      <span>{label}</span>
      <span>{value.toLocaleString("ko-KR")}원</span>
    </div>
  );
}
