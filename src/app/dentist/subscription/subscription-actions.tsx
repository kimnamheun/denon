"use client";

// 월 이용권 버튼 — 토스페이먼츠 카드 등록(자동결제) / 해지 / 해지 취소

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

const TOSS_SDK_URL = "https://js.tosspayments.com/v2/standard";

interface TossPaymentsInstance {
  payment(opts: { customerKey: string }): {
    requestBillingAuth(opts: {
      method: "CARD";
      successUrl: string;
      failUrl: string;
      customerEmail?: string;
      customerName?: string;
    }): Promise<void>;
  };
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

function loadTossSdk(): Promise<NonNullable<Window["TossPayments"]>> {
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TOSS_SDK_URL;
    s.async = true;
    s.onload = () => (window.TossPayments ? resolve(window.TossPayments) : reject(new Error("결제 모듈을 불러오지 못했습니다")));
    s.onerror = () => reject(new Error("결제 모듈을 불러오지 못했습니다"));
    document.head.appendChild(s);
  });
}

export function SubscribeButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/billing/prepare", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "결제 준비에 실패했습니다");
        return;
      }
      const TossPayments = await loadTossSdk();
      const payment = TossPayments(data.clientKey).payment({ customerKey: data.customerKey });
      // 카드 등록 창 → 성공하면 successUrl(서버)로 이동해 첫 결제까지 처리된다
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: data.successUrl,
        failUrl: data.failUrl,
        customerEmail: data.customerEmail ?? undefined,
        customerName: data.customerName ?? undefined,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "USER_CANCEL") setError(err instanceof Error ? err.message : "카드 등록을 시작하지 못했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button className="h-14 w-full text-lg" disabled={busy} onClick={onClick}>
        {busy ? "결제창 여는 중..." : label}
      </Button>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-base text-destructive">{error}</p>}
    </div>
  );
}

function ActionButton({ path, label, confirmText, variant }: { path: string; label: string; confirmText?: string; variant?: "outline" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message ?? "처리에 실패했습니다");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button className="h-12 w-full text-base" variant={variant} disabled={busy} onClick={onClick}>
        {label}
      </Button>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-base text-destructive">{error}</p>}
    </div>
  );
}

export function CancelButton() {
  return (
    <ActionButton
      path="/api/subscription/cancel"
      label="해지하기"
      variant="outline"
      confirmText="해지할까요? 다음 결제부터 멈추고, 이미 결제한 기간 끝까지는 쓸 수 있습니다."
    />
  );
}

export function ResumeButton() {
  return <ActionButton path="/api/subscription/resume" label="해지 취소하고 계속 쓰기" />;
}
