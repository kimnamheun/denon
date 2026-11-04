"use client";

// 관리자: 교육 사이트 수강 이력 CSV 붙여넣기 → 이수 이력 반영

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ImportResult {
  created: number;
  updated: number;
  skipped: { index: number; externalId?: string; reason: string }[];
}

const EXAMPLE = "externalId,licenseNumber,programKey,title,completedOn\nEDU-2026-0001,LIC-TEST-001,MASTER_COURSE,,2026-05-30";

export function CredentialImportForm({ programKeys }: { programKeys: string[] }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/credentials/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "가져오기에 실패했습니다");
        return;
      }
      setResult(data as ImportResult);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        엑셀에서 복사해 붙여넣거나 CSV 를 넣으세요. 첫 줄은 머리글(externalId, licenseNumber, programKey, title, completedOn)입니다.
        의사는 면허번호로 찾고, 같은 수강 ID 는 덮어씁니다. 들어온 이력은 바로 환자 화면에 표시됩니다.
      </p>
      <p className="text-xs text-muted-foreground">programKey: {programKeys.join(", ")} (모르면 비우고 title 에 과정명)</p>
      <Textarea
        rows={6}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder={EXAMPLE}
        className="font-mono text-xs"
        required
      />
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {result && (
        <div className="rounded-md border p-3 text-sm">
          <p>
            새로 {result.created}건 · 갱신 {result.updated}건 · 건너뜀 {result.skipped.length}건
          </p>
          {result.skipped.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-red-700">
              {result.skipped.slice(0, 20).map((s) => (
                <li key={`${s.index}-${s.externalId ?? ""}`}>
                  {s.index + 2}번째 줄{s.externalId ? ` (${s.externalId})` : ""}: {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "가져오는 중..." : "가져오기"}
      </Button>
    </form>
  );
}
