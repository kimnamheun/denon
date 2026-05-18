import Link from "next/link";
import { Star, MapPin, ShieldCheck, TrendingUp } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { maskName, formatBudgetRange, timeAgo } from "@/lib/anonymize";

export const revalidate = 60; // 1분 ISR

const URGENCY_LABEL: Record<string, { label: string; className: string }> = {
  LOW: { label: "여유", className: "bg-gray-100 text-gray-700" },
  MEDIUM: { label: "보통", className: "bg-amber-100 text-amber-700" },
  HIGH: { label: "시급", className: "bg-red-100 text-red-700" },
};

export default async function HomePage() {
  const session = await auth();

  // 병렬 데이터 조회
  const [
    totalClinics,
    totalDentists,
    totalQuotations,
    totalReviews,
    recentRequests,
    topClinics,
    recentReviews,
  ] = await Promise.all([
    prisma.clinic.count({ where: { deletedAt: null } }),
    prisma.dentist.count({ where: { isVerified: true } }),
    prisma.quotation.count({ where: { deletedAt: null } }),
    prisma.review.count({ where: { deletedAt: null } }),

    // 최근 견적 요청 (공개용 - 익명화)
    prisma.quotationRequest.findMany({
      where: { status: "OPEN", deletedAt: null },
      include: {
        missingTeeth: true,
        patient: { include: { user: { select: { name: true } } } },
        _count: { select: { quotations: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),

    // 인기 치과 (평점 + 리뷰수 + 프리미엄)
    prisma.clinic.findMany({
      where: { deletedAt: null },
      include: {
        implantBrands: { select: { brandName: true } },
        _count: { select: { reviews: { where: { deletedAt: null } } } },
      },
      orderBy: [
        { isPremium: "desc" },
        { rating: "desc" },
        { reviewCount: "desc" },
      ],
      take: 6,
    }),

    // 최근 리뷰
    prisma.review.findMany({
      where: { deletedAt: null },
      include: {
        patient: { include: { user: { select: { name: true } } } },
        clinic: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  return (
    <main>
      {/* ===== Hero ===== */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 border-b">
        <div className="container max-w-5xl py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium mb-4">
            <ShieldCheck className="h-3 w-3" /> 검증된 치과의사만 매칭
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            여러 치과의 임플란트 견적, <br />
            <span className="text-blue-600">한 번에 비교</span>하세요
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8">
            구강 사진과 증상을 올리면 주변 치과에서 견적서를 보내드립니다. <br className="hidden sm:inline" />
            가격, 브랜드, 보증기간을 투명하게 비교하고 선택하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {session?.user ? (
              <>
                <Link href={dashboardPathByRole(session.user.role)}>
                  <Button size="lg">내 대시보드</Button>
                </Link>
                {session.user.role === "PATIENT" && (
                  <Link href="/patient/quotation-requests/new">
                    <Button size="lg" variant="outline">새 견적 요청</Button>
                  </Link>
                )}
                <Link href="/clinics/search">
                  <Button size="lg" variant="ghost">병원 둘러보기</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/register">
                  <Button size="lg">무료 견적 받기</Button>
                </Link>
                <Link href="/clinics/search">
                  <Button size="lg" variant="outline">병원 둘러보기</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ===== 통계 ===== */}
      <section className="container max-w-5xl py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="등록 병원" value={totalClinics} />
          <StatCard label="인증 의사" value={totalDentists} />
          <StatCard label="누적 견적서" value={totalQuotations} />
          <StatCard label="만족 후기" value={totalReviews} />
        </div>
      </section>

      {/* ===== 최근 견적 요청 ===== */}
      <section className="container max-w-5xl py-10">
        <SectionHeader
          icon={<TrendingUp className="h-5 w-5" />}
          title="실시간 견적 요청"
          subtitle="환자분들이 방금 올린 요청"
          link={session?.user?.role === "DENTIST" ? "/dentist/quotation-requests/available" : undefined}
        />
        {recentRequests.length === 0 ? (
          <EmptyState>아직 견적 요청이 없습니다</EmptyState>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentRequests.map((r) => {
              const urg = URGENCY_LABEL[r.urgency];
              return (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="text-sm font-medium">
                        {maskName(r.patient.user.name)} 님
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${urg.className}`}>
                        {urg.label}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      치아 {r.missingTeeth.length}개 임플란트
                    </div>
                    <p className="text-xs line-clamp-2 text-foreground/70 min-h-[2.5rem]">
                      {r.symptoms ?? "(증상 미입력)"}
                    </p>
                    <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-muted-foreground">
                      <span>{formatBudgetRange(r.minBudget, r.maxBudget)}</span>
                      <span>{timeAgo(r.createdAt)} · 견적 {r._count.quotations}건</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== 인기 치과 ===== */}
      <section className="bg-muted/30 border-y">
        <div className="container max-w-5xl py-10">
          <SectionHeader
            icon={<Star className="h-5 w-5" />}
            title="추천 치과"
            subtitle="평점이 높은 인증 병원"
            link="/clinics/search"
          />
          {topClinics.length === 0 ? (
            <EmptyState>등록된 병원이 없습니다</EmptyState>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {topClinics.map((c) => (
                <Link key={c.id} href={`/clinics/${c.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold line-clamp-1">{c.name}</h3>
                        {c.isPremium && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                            프리미엄
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{Number(c.rating).toFixed(1)}</span>
                        <span className="text-muted-foreground text-xs">
                          ({c._count.reviews}개 리뷰)
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3" />
                        {c.sido} {c.sigungu}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {c.implantBrands.slice(0, 3).map((b) => (
                          <span
                            key={b.brandName}
                            className="text-[10px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
                          >
                            {b.brandName}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== 최근 리뷰 ===== */}
      <section className="container max-w-5xl py-10">
        <SectionHeader
          icon={<Star className="h-5 w-5" />}
          title="실제 환자 후기"
          subtitle="치료 받은 분들의 솔직한 리뷰"
        />
        {recentReviews.length === 0 ? (
          <EmptyState>아직 등록된 리뷰가 없습니다</EmptyState>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentReviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                        {r.patient.user.name[0]}
                      </div>
                      <span className="text-sm font-medium">{maskName(r.patient.user.name)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/clinics/${r.clinic.id}`}
                    className="text-xs text-blue-600 hover:underline mb-2 inline-block"
                  >
                    📍 {r.clinic.name}
                  </Link>
                  <p className="text-sm line-clamp-3 text-foreground/80">
                    {r.comment ?? "(리뷰 내용 없음)"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">{timeAgo(r.createdAt)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ===== 이용 안내 ===== */}
      <section className="bg-muted/30 border-y">
        <div className="container max-w-5xl py-10">
          <h2 className="text-xl font-bold text-center mb-8">이렇게 이용하세요</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <HowCard step="1" title="요청 작성" desc="치아 위치와 증상, 사진 첨부" />
            <HowCard step="2" title="견적 비교" desc="여러 치과에서 받은 견적서 비교" />
            <HowCard step="3" title="상담 예약" desc="원하는 치과와 상담 일정 잡기" />
            <HowCard step="4" title="치료 + 리뷰" desc="치료 받고 후기 남기기" />
          </div>
        </div>
      </section>

      {/* ===== Footer CTA ===== */}
      {!session?.user && (
        <section className="container max-w-3xl py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">지금 시작하세요</h2>
          <p className="text-muted-foreground mb-6">
            가입 1분, 견적 요청 3분. 평균 24시간 내 응답.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/auth/register">
              <Button size="lg">무료 회원가입</Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline">로그인</Button>
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

// ============================================================
// Subcomponents
// ============================================================

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-2xl sm:text-3xl font-bold text-blue-600">
          {value.toLocaleString("ko-KR")}
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  link?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          {icon} {title}
        </h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {link && (
        <Link href={link} className="text-sm text-blue-600 hover:underline whitespace-nowrap">
          전체보기 →
        </Link>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

function HowCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mx-auto mb-3">
        {step}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function dashboardPathByRole(role: string): string {
  if (role === "PATIENT") return "/patient/dashboard";
  if (role === "DENTIST") return "/dentist/dashboard";
  if (role === "ADMIN") return "/admin/dashboard";
  return "/";
}
