// 오스템 교육 프로그램 — 교육 사이트 신청 화면으로 보내는 카드 (서버 컴포넌트)

import { ExternalLink } from "lucide-react";

import { TRACK_LABEL, type EducationProgram } from "@/lib/content/education-programs";

const TRACK_STYLE: Record<string, string> = {
  MASTER: "bg-amber-100 text-amber-800",
  BASIC: "bg-blue-100 text-blue-800",
  SINGLE: "bg-muted text-foreground",
};

export function EducationProgramCards({
  programs,
  title,
  description,
}: {
  programs: ReadonlyArray<EducationProgram>;
  title: string;
  description?: string;
}) {
  if (programs.length === 0) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {programs.map((p) => (
          <li key={p.key}>
            <a
              href={p.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full flex-col gap-2 rounded-lg border p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${TRACK_STYLE[p.track]}`}>
                  {TRACK_LABEL[p.track]}
                </span>
                <span className="text-base font-bold">{p.name}</span>
              </div>
              <p className="flex-1 text-sm text-muted-foreground">{p.summary}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
                교육 사이트에서 일정 보고 신청 <ExternalLink className="h-4 w-4" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
