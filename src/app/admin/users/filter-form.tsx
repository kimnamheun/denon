"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup } from "@/components/ui/toggle-group";

export function FilterForm() {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [role, setRole] = useState<string | null>(sp.get("role") || null);
  const [status, setStatus] = useState<string | null>(sp.get("status") || null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    router.push(`?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 또는 이메일"
          className="w-64"
        />
        <Button type="submit">검색</Button>
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-1.5">역할</label>
        <ToggleGroup
          size="sm"
          clearable
          options={[
            { value: "PATIENT", label: "환자" },
            { value: "DENTIST", label: "치과의사" },
            { value: "ADMIN", label: "관리자" },
          ]}
          value={role}
          onChange={setRole}
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-1.5">상태</label>
        <ToggleGroup
          size="sm"
          clearable
          options={[
            { value: "ACTIVE", label: "활성" },
            { value: "INACTIVE", label: "비활성" },
            { value: "SUSPENDED", label: "정지" },
          ]}
          value={status}
          onChange={setStatus}
        />
      </div>
    </form>
  );
}
