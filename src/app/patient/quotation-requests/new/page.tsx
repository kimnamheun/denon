"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToothSelector } from "@/components/tooth-selector";
import { WizardStep } from "@/components/wizard/wizard-step";
import { BigToggleGroup } from "@/components/wizard/big-toggle-group";
import { uploadFile } from "@/lib/upload";
import {
  SYMPTOM_OPTIONS,
  TREATMENT_HISTORY_OPTIONS,
  URGENCY_OPTIONS,
  BUDGET_OPTIONS,
  BRAND_OPTIONS,
  HOSPITAL_TYPE_OPTIONS,
  type UrgencyValue,
  getBudgetRange,
  labelsOf,
} from "@/lib/constants/quotation-options";

const TOTAL_STEPS = 8;

export default function NewQuotationRequestPage() {
  const router = useRouter();

  /* ── 단계 ─────────────────────────────────────── */
  const [step, setStep] = useState(1);

  /* ── 입력 상태 ────────────────────────────────── */
  const [missingTeeth, setMissingTeeth] = useState<string[]>([]);

  const [symptomTags, setSymptomTags] = useState<string[]>([]);
  const [symptomEtcOpen, setSymptomEtcOpen] = useState(false);
  const [symptomEtcText, setSymptomEtcText] = useState("");

  const [historyTags, setHistoryTags] = useState<string[]>([]);

  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [urgency, setUrgency] = useState<UrgencyValue>("MEDIUM");

  const [budgetValue, setBudgetValue] = useState<string | null>(null);

  const [brandValue, setBrandValue] = useState<string | null>(null);
  const [hospitalTypeValue, setHospitalTypeValue] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── 단계 이동 ────────────────────────────────── */
  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  /* ── 사진 업로드 ──────────────────────────────── */
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(files.map((f) => uploadFile(f)));
      setPhotoUrls((prev) => [...prev, ...uploaded.map((u) => u.publicUrl)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진 업로드 실패");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removePhoto(url: string) {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  }

  /* ── 제출 ─────────────────────────────────────── */
  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      // 증상 = 선택 라벨들 + 기타 자유 입력
      const symptomLabels = labelsOf(SYMPTOM_OPTIONS, symptomTags);
      const symptomEtc = symptomEtcOpen ? symptomEtcText.trim() : "";
      const symptomsCombined = [...symptomLabels, symptomEtc]
        .filter(Boolean)
        .join(", ");

      const historyLabels = labelsOf(TREATMENT_HISTORY_OPTIONS, historyTags);
      const historyCombined = historyLabels.join(", ");

      const budget = getBudgetRange(budgetValue);

      const res = await fetch("/api/quotation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: symptomsCombined || undefined,
          previousTreatment: historyCombined || undefined,
          urgency,
          minBudget: budget.min ?? undefined,
          maxBudget: budget.max ?? undefined,
          preferredImplantBrand:
            brandValue && brandValue !== "any"
              ? BRAND_OPTIONS.find((b) => b.value === brandValue)?.label
              : undefined,
          preferredHospitalType:
            hospitalTypeValue && hospitalTypeValue !== "any"
              ? HOSPITAL_TYPE_OPTIONS.find((h) => h.value === hospitalTypeValue)?.label
              : undefined,
          missingTeeth,
          photoUrls,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "견적 요청 생성에 실패했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }

      router.push("/patient/quotation-requests");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── 단계별 검증 ──────────────────────────────── */
  const canNext = useMemo(() => {
    switch (step) {
      case 1: return missingTeeth.length > 0;
      case 2: {
        if (symptomTags.length > 0) return true;
        if (symptomEtcOpen && symptomEtcText.trim().length > 0) return true;
        return false;
      }
      case 3: return true; // 치료 이력은 선택, "처음 방문" 도 빈 상태로 통과 가능
      case 4: return true; // 사진 선택
      case 5: return Boolean(urgency);
      case 6: return Boolean(budgetValue);
      case 7: return Boolean(brandValue && hospitalTypeValue);
      case 8: return true;
      default: return false;
    }
  }, [step, missingTeeth, symptomTags, symptomEtcOpen, symptomEtcText, urgency, budgetValue, brandValue, hospitalTypeValue]);

  /* ── 렌더 ─────────────────────────────────────── */
  if (step === 1) {
    return (
      <WizardStep
        current={1}
        total={TOTAL_STEPS}
        title="어느 치아가 불편하신가요?"
        description="문제 있는 치아를 모두 눌러주세요. 여러 개 선택할 수 있어요."
        canNext={canNext}
        onNext={goNext}
      >
        <ToothSelector value={missingTeeth} onChange={setMissingTeeth} />
        {missingTeeth.length > 0 && (
          <p className="mt-4 rounded-lg bg-primary/10 px-4 py-3 text-base font-medium text-primary">
            {missingTeeth.length}개 치아 선택됨
          </p>
        )}
      </WizardStep>
    );
  }

  if (step === 2) {
    return (
      <WizardStep
        current={2}
        total={TOTAL_STEPS}
        title="어떤 증상이 있으세요?"
        description="해당되는 증상을 모두 눌러주세요. 여러 개 선택할 수 있어요."
        canNext={canNext}
        onPrev={goPrev}
        onNext={goNext}
      >
        <BigToggleGroup multi options={SYMPTOM_OPTIONS} value={symptomTags} onChange={setSymptomTags} />

        {/* 기타 자유 입력 토글 */}
        <button
          type="button"
          onClick={() => setSymptomEtcOpen((v) => !v)}
          className="mt-4 flex w-full items-center justify-center rounded-xl border-2 border-dashed border-input px-5 py-4 text-base font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          {symptomEtcOpen ? "기타 입력 닫기" : "여기에 없는 증상이 있어요"}
        </button>
        {symptomEtcOpen && (
          <Textarea
            value={symptomEtcText}
            onChange={(e) => setSymptomEtcText(e.target.value)}
            placeholder="자유롭게 적어주세요"
            rows={3}
            className="mt-3 text-base"
          />
        )}
      </WizardStep>
    );
  }

  if (step === 3) {
    return (
      <WizardStep
        current={3}
        total={TOTAL_STEPS}
        title="치과 치료를 받은 적이 있으세요?"
        description="해당되는 항목을 모두 눌러주세요. 없으면 그냥 다음으로 가셔도 돼요."
        canNext={canNext}
        onPrev={goPrev}
        onNext={goNext}
      >
        <BigToggleGroup
          multi
          options={TREATMENT_HISTORY_OPTIONS}
          value={historyTags}
          onChange={setHistoryTags}
        />
      </WizardStep>
    );
  }

  if (step === 4) {
    return (
      <WizardStep
        current={4}
        total={TOTAL_STEPS}
        title="입 안 사진을 보내실래요?"
        description="사진이 있으면 치과에서 더 정확한 견적을 만들 수 있어요. 없으면 건너뛰셔도 돼요."
        canNext
        onPrev={goPrev}
        onNext={goNext}
        onSkip={photoUrls.length === 0 ? goNext : undefined}
      >
        <label
          className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-input bg-muted/30 px-6 py-8 text-center transition-colors hover:border-primary/60 hover:bg-muted/50"
        >
          <Camera className="mb-3 h-10 w-10 text-muted-foreground" />
          <span className="text-lg font-semibold">사진 고르기</span>
          <span className="mt-1 text-sm text-muted-foreground">
            여러 장 한꺼번에 고를 수 있어요
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={onFileChange}
            disabled={uploading}
          />
        </label>
        {uploading && (
          <p className="mt-3 text-center text-base font-medium text-muted-foreground">
            업로드 중...
          </p>
        )}
        {photoUrls.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {photoUrls.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="첨부 사진" className="h-28 w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-md"
                  aria-label="사진 삭제"
                >
                  <X className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
      </WizardStep>
    );
  }

  if (step === 5) {
    return (
      <WizardStep
        current={5}
        total={TOTAL_STEPS}
        title="얼마나 급하세요?"
        description="치료가 언제까지 필요하신지 알려주세요."
        canNext={canNext}
        onPrev={goPrev}
        onNext={goNext}
      >
        <BigToggleGroup
          options={URGENCY_OPTIONS}
          value={urgency}
          onChange={(v) => setUrgency(v)}
        />
      </WizardStep>
    );
  }

  if (step === 6) {
    return (
      <WizardStep
        current={6}
        total={TOTAL_STEPS}
        title="예산은 어느 정도 생각하세요?"
        description="대략 어느 정도까지 쓸 수 있는지 골라주세요. 잘 모르겠으면 '상담 후 결정' 도 괜찮아요."
        canNext={canNext}
        onPrev={goPrev}
        onNext={goNext}
      >
        <BigToggleGroup
          options={BUDGET_OPTIONS}
          value={budgetValue}
          onChange={setBudgetValue}
        />
      </WizardStep>
    );
  }

  if (step === 7) {
    return (
      <WizardStep
        current={7}
        total={TOTAL_STEPS}
        title="어떤 병원과 임플란트를 원하세요?"
        description="잘 모르시면 '상관없어요' 또는 '추천해 주세요' 를 골라주시면 돼요."
        canNext={canNext}
        onPrev={goPrev}
        onNext={goNext}
      >
        <section>
          <h2 className="mb-3 text-lg font-bold">임플란트 브랜드</h2>
          <BigToggleGroup
            options={BRAND_OPTIONS}
            value={brandValue}
            onChange={setBrandValue}
          />
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">병원 종류</h2>
          <BigToggleGroup
            options={HOSPITAL_TYPE_OPTIONS}
            value={hospitalTypeValue}
            onChange={setHospitalTypeValue}
          />
        </section>
      </WizardStep>
    );
  }

  // step === 8 (확인 + 제출)
  return (
    <WizardStep
      current={8}
      total={TOTAL_STEPS}
      title="이대로 보낼까요?"
      description="내용이 맞는지 한 번만 확인해 주세요. 보내면 여러 치과에서 견적을 만들어 드려요."
      canNext={!submitting}
      onPrev={goPrev}
      onNext={onSubmit}
      nextLabel="견적 요청 보내기"
      loading={submitting}
    >
      <div className="space-y-4 rounded-2xl border-2 bg-muted/30 p-5">
        <Summary label="치아" value={`${missingTeeth.length}개 선택`} />
        <Summary
          label="증상"
          value={
            [
              ...labelsOf(SYMPTOM_OPTIONS, symptomTags),
              symptomEtcOpen && symptomEtcText.trim() ? symptomEtcText.trim() : "",
            ]
              .filter(Boolean)
              .join(", ") || "—"
          }
        />
        <Summary
          label="치료 이력"
          value={labelsOf(TREATMENT_HISTORY_OPTIONS, historyTags).join(", ") || "—"}
        />
        <Summary label="사진" value={photoUrls.length > 0 ? `${photoUrls.length}장` : "없음"} />
        <Summary
          label="시급도"
          value={URGENCY_OPTIONS.find((u) => u.value === urgency)?.label ?? "—"}
        />
        <Summary
          label="예산"
          value={BUDGET_OPTIONS.find((b) => b.value === budgetValue)?.label ?? "—"}
        />
        <Summary
          label="브랜드"
          value={BRAND_OPTIONS.find((b) => b.value === brandValue)?.label ?? "—"}
        />
        <Summary
          label="병원 종류"
          value={HOSPITAL_TYPE_OPTIONS.find((h) => h.value === hospitalTypeValue)?.label ?? "—"}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-base font-medium text-destructive">
          {error}
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        onClick={() => router.back()}
        className="mt-3 h-12 w-full text-base"
        disabled={submitting}
      >
        전체 취소하고 나가기
      </Button>
    </WizardStep>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 shrink-0 text-base font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="flex-1 text-base font-medium text-foreground">{value}</span>
    </div>
  );
}
