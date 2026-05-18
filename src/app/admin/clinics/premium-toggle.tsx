"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function PremiumToggle({
  clinicId,
  isPremium,
}: {
  clinicId: string;
  isPremium: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/clinics/${clinicId}/premium`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPremium: !isPremium }),
      });
      if (!res.ok) return alert("변경 실패");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant={isPremium ? "outline" : "default"} disabled={busy} onClick={toggle}>
      {isPremium ? "해제" : "프리미엄 설정"}
    </Button>
  );
}
