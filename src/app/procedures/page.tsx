// 환자용 술식 안내 목록 (공개) — 임플란트 치료 흐름 순서

import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PROCEDURE_DISCLAIMER, PROCEDURE_GUIDES } from "@/lib/content/procedures";

export const metadata: Metadata = {
  title: "치료 미리 알아보기 | 임플란트 플랫폼",
  description: "견적서에 나오는 임플란트 치료를 쉬운 말로 설명합니다.",
};

export default function ProceduresPage() {
  return (
    <main className="container max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">치료 미리 알아보기</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          견적서에 나오는 치료를 쉬운 말로 설명해 드려요. 임플란트 치료 순서대로 모았어요.
        </p>
      </div>

      <ol className="space-y-3">
        {PROCEDURE_GUIDES.map((g, i) => (
          <li key={g.tag}>
            <Link href={`/procedures/${g.tag}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold">{g.name}</p>
                    <p className="text-base text-muted-foreground">{g.oneLine}</p>
                  </div>
                  <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ol>

      <p className="rounded-lg bg-muted/50 p-4 text-base text-muted-foreground">{PROCEDURE_DISCLAIMER}</p>
    </main>
  );
}
