"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  isVerified?: boolean;
  specialization?: string;
  clinicName?: string;
}

const ROLE_LABEL: Record<string, string> = {
  PATIENT: "환자",
  DENTIST: "치과의사",
  ADMIN: "관리자",
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "활성", className: "bg-green-100 text-green-700" },
  INACTIVE: { label: "비활성", className: "bg-gray-100 text-gray-700" },
  SUSPENDED: { label: "정지", className: "bg-red-100 text-red-700" },
};

export function UserRow({ user, isSelf }: { user: UserData; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const status = STATUS_LABEL[user.status];

  async function changeStatus(newStatus: string) {
    if (!confirm(`사용자 상태를 '${STATUS_LABEL[newStatus].label}'(으)로 변경?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message ?? "변경 실패");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t">
      <td className="p-3">
        <div className="font-medium">{user.name}</div>
        {user.specialization && (
          <div className="text-xs text-muted-foreground">{user.specialization}</div>
        )}
      </td>
      <td className="p-3">
        <div>{user.email}</div>
        {user.clinicName && (
          <div className="text-xs text-muted-foreground">{user.clinicName}</div>
        )}
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1">
          <span>{ROLE_LABEL[user.role]}</span>
          {user.role === "DENTIST" && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                user.isVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {user.isVerified ? "✓ 인증" : "미인증"}
            </span>
          )}
        </div>
      </td>
      <td className="p-3">
        <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>{status.label}</span>
      </td>
      <td className="p-3 text-xs text-muted-foreground">
        {new Date(user.createdAt).toLocaleDateString("ko-KR")}
      </td>
      <td className="p-3 pr-4 text-right">
        {isSelf ? (
          <span className="text-xs text-muted-foreground">본인</span>
        ) : (
          <div className="flex gap-1 justify-end">
            {user.status === "ACTIVE" ? (
              <>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => changeStatus("INACTIVE")}>
                  비활성
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  disabled={busy}
                  onClick={() => changeStatus("SUSPENDED")}
                >
                  정지
                </Button>
              </>
            ) : (
              <Button size="sm" disabled={busy} onClick={() => changeStatus("ACTIVE")}>
                활성화
              </Button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
