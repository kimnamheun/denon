"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function VerifyButton({
  dentistId,
  isVerified,
}: {
  dentistId: string;
  isVerified: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/dentists/${dentistId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !isVerified }),
      });
      if (!res.ok) return alert("변경 실패");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant={isVerified ? "outline" : "default"} disabled={busy} onClick={toggle}>
      {isVerified ? "인증 해제" : "인증"}
    </Button>
  );
}
