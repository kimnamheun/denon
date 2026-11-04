// 견적서에 나온 시술 → 환자용 설명 페이지 바로가기 (서버 컴포넌트)

import Link from "next/link";
import { BookOpen } from "lucide-react";

import type { ProcedureGuide } from "@/lib/content/procedures";

export function ProcedureChips({ guides, title = "이 견적에 나오는 치료 알아보기" }: {
  guides: ReadonlyArray<ProcedureGuide>;
  title?: string;
}) {
  if (guides.length === 0) return null;
  return (
    <div className="rounded-lg border bg-blue-50/50 p-4">
      <p className="mb-3 flex items-center gap-2 text-base font-semibold">
        <BookOpen className="h-5 w-5 text-blue-600" /> {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {guides.map((g) => (
          <Link
            key={g.tag}
            href={`/procedures/${g.tag}`}
            className="inline-flex h-11 items-center rounded-full border bg-background px-4 text-base font-medium hover:bg-muted"
          >
            {g.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
