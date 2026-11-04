"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function ReviewButtons({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function send(body: { action: "VERIFY" } | { action: "REJECT"; reason: string }) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/credentials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.message ?? "처리에 실패했습니다");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function onReject() {
    const reason = prompt("반려 사유 (의사에게 보입니다)");
    if (reason === null) return;
    if (!reason.trim()) return alert("반려 사유를 입력하세요");
    void send({ action: "REJECT", reason: reason.trim() });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={busy} onClick={() => send({ action: "VERIFY" })}>
        확인
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={onReject}>
        반려
      </Button>
    </div>
  );
}
