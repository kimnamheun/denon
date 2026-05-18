import { notFound } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DAY_LABEL: Record<string, string> = {
  MONDAY: "월",
  TUESDAY: "화",
  WEDNESDAY: "수",
  THURSDAY: "목",
  FRIDAY: "금",
  SATURDAY: "토",
  SUNDAY: "일",
};

export default async function ClinicDetailPage({ params }: { params: { id: string } }) {
  const clinic = await prisma.clinic.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      dentists: { include: { user: { select: { name: true } } } },
      businessHours: true,
      photos: { orderBy: { displayOrder: "asc" } },
      implantBrands: true,
      reviews: {
        where: { deletedAt: null },
        include: { patient: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { reviews: { where: { deletedAt: null } } } },
    },
  });

  if (!clinic) notFound();

  return (
    <main className="container max-w-3xl py-10 space-y-6">
      <Link href="/clinics/search" className="text-sm text-muted-foreground hover:underline">
        ← 병원 검색으로
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                {clinic.name}
                {clinic.isPremium && (
                  <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">
                    프리미엄
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                평점 {Number(clinic.rating).toFixed(1)} ({clinic._count.reviews}개 리뷰)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {clinic.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {clinic.photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.url} alt={clinic.name} className="w-full h-32 object-cover rounded" />
              ))}
            </div>
          )}

          <Section title="주소">
            {clinic.sido} {clinic.sigungu} {clinic.dong} {clinic.detailAddress}
          </Section>

          {clinic.phoneNumber && <Section title="전화번호">{clinic.phoneNumber}</Section>}

          {clinic.description && <Section title="소개">{clinic.description}</Section>}

          <Section title="임플란트 브랜드">
            {clinic.implantBrands.length === 0
              ? "-"
              : clinic.implantBrands.map((b) => b.brandName).join(", ")}
          </Section>

          {clinic.businessHours.length > 0 && (
            <Section title="영업시간">
              <ul className="space-y-1">
                {clinic.businessHours.map((h) => (
                  <li key={h.id} className="flex gap-3">
                    <span className="w-6 font-medium">{DAY_LABEL[h.dayOfWeek]}</span>
                    {h.isClosed ? (
                      <span className="text-muted-foreground">휴진</span>
                    ) : (
                      <span>
                        {h.openTime} ~ {h.closeTime}
                        {h.breakStart && h.breakEnd && (
                          <span className="text-muted-foreground"> (휴게 {h.breakStart}~{h.breakEnd})</span>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {clinic.dentists.length > 0 && (
            <Section title="의료진">
              <ul>
                {clinic.dentists.map((d) => (
                  <li key={d.id}>
                    {d.user.name} 원장 · {d.specialization}
                    {d.isVerified && (
                      <span className="ml-2 text-xs text-green-700">✓ 인증</span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </CardContent>
      </Card>

      {clinic.reviews.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-3">최근 리뷰</h2>
          <div className="space-y-2">
            {clinic.reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{r.patient.user.name.slice(0, 1)}***</span>
                    <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                  </div>
                  {r.comment && <p className="text-sm mt-2">{r.comment}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}
