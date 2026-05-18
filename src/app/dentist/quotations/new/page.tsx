"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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

export default function NewQuotationPage() {
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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!treatmentPlan.trim()) {
      setError("치료 계획을 입력해주세요");
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
          treatmentPlan,
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
          </CardHeader>
          <CardContent>
            <Textarea
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              placeholder="제안하는 치료 계획을 상세히 작성하세요"
              rows={5}
              required
            />
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
          <CardContent className="space-y-3">
            {implantItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-2">
                  <Label className="text-xs">치아번호</Label>
                  <Input
                    value={item.toothNumber}
                    onChange={(e) => updateImplant(idx, { toothNumber: e.target.value })}
                    placeholder="11"
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">브랜드</Label>
                  <Input
                    value={item.brand}
                    onChange={(e) => updateImplant(idx, { brand: e.target.value })}
                    placeholder="오스템 등"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">수량</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateImplant(idx, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">단가 (원)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={10000}
                    value={item.unitPrice}
                    onChange={(e) => updateImplant(idx, { unitPrice: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeImplant(idx)}
                    aria-label="삭제"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="text-right text-sm pt-2 border-t">
              임플란트 합계: <span className="font-semibold">{implantTotal.toLocaleString("ko-KR")}원</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>3. 추가 항목</CardTitle>
                <CardDescription>크라운, 본 이식 등</CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addAdditional}>
                <Plus className="h-4 w-4 mr-1" /> 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {additionalItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                추가 항목이 없습니다
              </p>
            )}
            {additionalItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-8">
                  <Label className="text-xs">내용</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateAdditional(idx, { description: e.target.value })}
                    placeholder="예: 본 이식술"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">금액 (원)</Label>
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
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. 조건 / 합계</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>치료 기간 (개월)</Label>
                <Input
                  type="number"
                  min={1}
                  value={treatmentDuration}
                  onChange={(e) => setTreatmentDuration(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>보증 기간 (년)</Label>
                <Input
                  type="number"
                  min={0}
                  value={warrantyPeriod}
                  onChange={(e) => setWarrantyPeriod(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>할인율 (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discountRate}
                  onChange={(e) => setDiscountRate(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label>유효기간</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>추가 메모</Label>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
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
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
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
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <span>{value.toLocaleString("ko-KR")}원</span>
    </div>
  );
}
