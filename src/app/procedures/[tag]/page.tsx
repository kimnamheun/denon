// 환자용 술식 안내 상세 (공개)

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PROCEDURE_DISCLAIMER,
  PROCEDURE_GUIDES,
  getProcedureGuide,
} from "@/lib/content/procedures";

type Props = { params: { tag: string } };

export function generateStaticParams() {
  return PROCEDURE_GUIDES.map((g) => ({ tag: g.tag }));
}

export function generateMetadata({ params }: Props): Metadata {
  const g = getProcedureGuide(params.tag);
  if (!g) return {};
  return { title: `${g.name} | 치료 미리 알아보기`, description: g.oneLine };
}

export default function ProcedureGuidePage({ params }: Props) {
  const g = getProcedureGuide(params.tag);
  if (!g) notFound();

  const related = g.related.map(getProcedureGuide).filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <main className="container max-w-3xl py-8 space-y-5">
      <Link href="/procedures" className="text-base text-muted-foreground hover:underline">
        ← 치료 목록
      </Link>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{g.name}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{g.oneLine}</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-base">
          <Clock className="h-4 w-4" /> {g.duration}
        </p>
      </div>

      <Section title="어떤 치료인가요?">
        <p className="text-lg leading-relaxed">{g.what}</p>
      </Section>

      <Section title="이럴 때 해요">
        <ul className="space-y-2 text-lg">
          {g.when.map((w) => (
            <li key={w} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="이렇게 진행해요">
        <ol className="space-y-4">
          {g.steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <p className="text-lg font-semibold">{s.title}</p>
                <p className="text-base text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="치료 후 이렇게 해요">
        <ul className="space-y-2 text-lg">
          {g.afterCare.map((a) => (
            <li key={a} className="flex gap-2">
              <span aria-hidden>✓</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </Section>

      {g.faqs.length > 0 && (
        <Section title="자주 묻는 질문">
          <dl className="space-y-4">
            {g.faqs.map((f) => (
              <div key={f.q}>
                <dt className="text-lg font-semibold">Q. {f.q}</dt>
                <dd className="mt-1 text-base text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {related.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-bold">함께 보면 좋은 치료</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Link key={r.tag} href={`/procedures/${r.tag}`}>
                <Button variant="outline" className="h-11 text-base">
                  {r.name}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="rounded-lg bg-muted/50 p-4 text-base text-muted-foreground">{PROCEDURE_DISCLAIMER}</p>

      <Link href="/patient/quotation-requests/new" className="block">
        <Button className="h-14 w-full text-lg">견적 요청하러 가기</Button>
      </Link>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
