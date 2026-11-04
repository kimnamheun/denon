"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function GrantButtons({ dentistId }: { dentistId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function grant(months: number) {
    if (!confirm(`결제 없이 ${months}개월을 부여할까요? 남은 기간 뒤에 이어 붙습니다.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/subscriptions/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dentistId, months }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.message ?? "부여에 실패했습니다");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex justify-end gap-1">
      {[1, 3].map((m) => (
        <Button key={m} size="sm" variant="outline" disabled={busy} onClick={() => grant(m)}>
          +{m}개월
        </Button>
      ))}
    </div>
  );
}
