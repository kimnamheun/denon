"use client";

// 오프라인 연수 이수 등록 폼 + 삭제 버튼

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadFile } from "@/lib/upload";
import { kstDateString } from "@/lib/kst";
import { EDUCATION_ISSUER, EDUCATION_PROGRAMS, TRACK_LABEL } from "@/lib/content/education-programs";

export function OfflineCredentialForm() {
  const router = useRouter();
  const [programKey, setProgramKey] = useState("");
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState(EDUCATION_ISSUER);
  const [completedOn, setCompletedOn] = useState("");
  const [certificate, setCertificate] = useState<{ publicUrl: string; viewUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setError(null);
    try {
      const { publicUrl, viewUrl } = await uploadFile(f);
      setCertificate({ publicUrl, viewUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진 업로드 실패");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!certificate) {
      setError("수료증 사진을 올려주세요");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          issuer,
          completedOn,
          certificateUrl: certificate.publicUrl,
          programKey: programKey || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "등록에 실패했습니다");
        return;
      }
      setTitle("");
      setProgramKey("");
      setCompletedOn("");
      setCertificate(null);
      setDone(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cred-program" className="text-base">교육 프로그램</Label>
        <select
          id="cred-program"
          value={programKey}
          onChange={(e) => {
            const key = e.target.value;
            setProgramKey(key);
            const p = EDUCATION_PROGRAMS.find((x) => x.key === key);
            if (p) {
              setTitle(p.name);
              setIssuer(EDUCATION_ISSUER);
            }
          }}
          className="h-12 w-full rounded-md border bg-background px-3 text-base"
        >
          <option value="">기타 연수 (직접 입력)</option>
          {EDUCATION_PROGRAMS.map((p) => (
            <option key={p.key} value={p.key}>
              오스템 {p.name} ({TRACK_LABEL[p.track]})
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">
          교육 사이트 수강 이력이 연동되면 따로 등록하지 않아도 자동으로 올라옵니다.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cred-title" className="text-base">과정명 (수료증에 적힌 그대로)</Label>
        <Input
          id="cred-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 임플란트 상악동 거상술 연수회"
          className="h-12 text-base"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cred-issuer" className="text-base">주관 기관</Label>
          <Input
            id="cred-issuer"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cred-date" className="text-base">이수일</Label>
          <Input
            id="cred-date"
            type="date"
            value={completedOn}
            max={kstDateString()}
            onChange={(e) => setCompletedOn(e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-base font-medium">수료증 사진</p>
        {certificate ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={certificate.viewUrl} alt="수료증" className="h-40 rounded-lg border object-contain" />
            <button
              type="button"
              onClick={() => setCertificate(null)}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-md"
              aria-label="수료증 사진 빼기"
            >
              <X className="h-4 w-4" strokeWidth={3} />
            </button>
          </div>
        ) : (
          <label className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 px-6 py-6 text-center hover:bg-muted/50">
            <Camera className="mb-2 h-8 w-8 text-muted-foreground" />
            <span className="text-base font-semibold">{uploading ? "올리는 중..." : "수료증 사진 고르기"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPick}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-base text-destructive">{error}</p>}
      {done && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-base text-emerald-800">
          등록했습니다. 관리자가 수료증을 확인하면 환자 화면에 표시됩니다.
        </p>
      )}

      <Button type="submit" className="h-12 w-full text-lg" disabled={submitting || uploading}>
        {submitting ? "등록 중..." : "등록하기"}
      </Button>
    </form>
  );
}

export function DeleteCredentialButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm("이 이수 이력을 지울까요?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/credentials/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.message ?? "삭제에 실패했습니다");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      className="shrink-0 self-start rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
      aria-label="이수 이력 지우기"
    >
      <Trash2 className="h-5 w-5" />
    </button>
  );
}
