"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  quotationId: string;
  status: string;
  clinicId: string;
  dentistId: string;
}

export function QuotationActions({ quotationId, status, clinicId, dentistId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(action: "ACCEPT" | "REJECT") {
    if (action === "REJECT" && !confirm("이 견적서를 거절하시겠습니까?")) return;
    if (action === "ACCEPT" && !confirm("이 견적서를 수락하시겠습니까? 다른 견적서는 자동으로 거절됩니다.")) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotations/${quotationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "처리 실패");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (status === "PENDING") {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          {error && <div className="text-sm text-destructive">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => changeStatus("REJECT")}>
              거절
            </Button>
            <Button disabled={busy} onClick={() => changeStatus("ACCEPT")}>
              {busy ? "처리 중..." : "수락하기"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "ACCEPTED") {
    return (
      <Card>
        <CardContent className="p-5 flex justify-between items-center">
          <p className="text-sm text-green-700">이 견적서를 수락하셨습니다. 상담 예약을 진행하세요.</p>
          <Button
            onClick={() =>
              router.push(
                `/patient/appointments/booking?clinicId=${clinicId}&dentistId=${dentistId}&quotationId=${quotationId}`,
              )
            }
          >
            상담 예약하기
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
