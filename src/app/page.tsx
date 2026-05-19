import Link from "next/link";
import { Star, MapPin, ShieldCheck, Search } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { maskName, timeAgo } from "@/lib/anonymize";

import { HeroSearch } from "@/components/home/hero-search";
import { CategoryGrid } from "@/components/home/category-grid";
import { PatientHero } from "@/components/home/patient-hero";
import { DentistHero } from "@/components/home/dentist-hero";
import { AdminHero } from "@/components/home/admin-hero";
import { RegionalClinics } from "@/components/home/regional-clinics";
import { PatientTimeline } from "@/components/home/patient-timeline";

export const revalidate = 60;

export default async function HomePage() {
  const session = await auth();
  const user = session?.user;
  const role = user?.role;

  return (
    <main>
      {/* ===== Role-based Hero (가장 먼저 노출) ===== */}
      {role === "PATIENT" && user && <PatientHero userId={user.id} userName={user.name} />}
      {role === "DENTIST" && user && <DentistHero userId={user.id} userName={user.name} />}
      {role === "ADMIN" && user && <AdminHero userName={user.name} />}
      {!role && <PublicHero />}

      {/* ===== 시술 카테고리 (모든 사용자 공통, 환자/비로그인 우선 가치) ===== */}
      {(role === "PATIENT" || !role) && (
        <section className="container max-w-5xl py-8">
          <h2 className="text-xl font-bold mb-1">어떤 임플란트가 필요하세요?</h2>
          <p className="text-sm text-muted-foreground mb-4">카테고리를 선택하면 견적 요청으로 이동합니다</p>
          <CategoryGrid />
        </section>
      )}

      {/* ===== 환자 활동 타임라인 ===== */}
      {role === "PATIENT" && user && <PatientTimeline userId={user.id} />}

      {/* ===== 인기 치과 ===== */}
      <PopularClinicsSection />

      {/* ===== 지역별 인기 치과 (비로그인/환자) ===== */}
      {(role === "PATIENT" || !role) && <RegionalClinics />}

      {/* ===== 최근 리뷰 (비로그인/환자 우선) ===== */}
      {(role === "PATIENT" || !role) && <RecentReviewsSection />}

      {/* ===== 실시간 견적 요청 (의사가 가장 관심, 비로그인도 활동 증명용) ===== */}
      {role !== "PATIENT" && <LiveRequestsSection isDentist={role === "DENTIST"} />}

      {/* ===== 이용 안내 (비로그인만) ===== */}
      {!role && <HowItWorks />}

      {/* ===== Footer CTA ===== */}
      {!session?.user && (
        <section className="container max-w-3xl py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">지금 시작하세요</h2>
          <p className="text-muted-foreground mb-6">
            가입 1분, 견적 요청 3분. 평균 24시간 내 응답.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/auth/register"><Button size="lg">무료 회원가입</Button></Link>
            <Link href="/auth/login"><Button size="lg" variant="outline">로그인</Button></Link>
          </div>
        </section>
      )}
    </main>
  );
}

// ============================================================
// 비로그인 Hero
// ============================================================
async function PublicHero() {
  const [totalClinics, totalDentists, totalQuotations, totalReviews] = await Promise.all([
    prisma.clinic.count({ where: { deletedAt: null } }),
    prisma.dentist.count({ where: { isVerified: true } }),
    prisma.quotation.count({ where: { deletedAt: null } }),
    prisma.review.count({ where: { deletedAt: null } }),
  ]);

  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 border-b">
      <div className="container max-w-5xl py-12 md:py-20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium mb-4">
            <ShieldCheck className="h-3 w-3" /> 검증된 치과의사 {totalDentists}명
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            여러 치과의 임플란트 견적, <br />
            <span className="text-blue-600">한 번에 비교</span>하세요
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            구강 사진을 올리면 주변 치과들이 견적을 보내드립니다
          </p>
        </div>

        <HeroSearch />

        <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-8 max-w-3xl mx-auto">
          <MiniStat value={totalClinics} label="등록 병원" />
          <MiniStat value={totalDentists} label="인증 의사" />
          <MiniStat value={totalQuotations} label="누적 견적서" />
          <MiniStat value={totalReviews} label="만족 후기" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/auth/register">
            <Button size="lg" className="w-full sm:w-auto">무료 견적 받기</Button>
          </Link>
          <Link href="/clinics/search">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <Search className="h-4 w-4 mr-1" /> 병원 둘러보기
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-xl sm:text-3xl font-bold text-blue-600">
        {value.toLocaleString("ko-KR")}
      </div>
      <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

// ============================================================
// 인기 치과
// ============================================================
async function PopularClinicsSection() {
  const clinics = await prisma.clinic.findMany({
    where: { deletedAt: null },
    include: {
      implantBrands: { select: { brandName: true } },
      _count: { select: { reviews: { where: { deletedAt: null } } } },
    },
    orderBy: [{ isPremium: "desc" }, { rating: "desc" }, { reviewCount: "desc" }],
    take: 6,
  });
  if (clinics.length === 0) return null;

  return (
    <section className="bg-muted/30 border-y">
      <div className="container max-w-5xl py-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Star className="h-5 w-5" /> 추천 치과
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">평점이 높은 인증 병원</p>
          </div>
          <Link href="/clinics/search" className="text-sm text-blue-600 hover:underline whitespace-nowrap">
            전체보기 →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {clinics.map((c) => (
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
      </div>
    </section>
  );
}

// ============================================================
// 최근 리뷰
// ============================================================
async function RecentReviewsSection() {
  const reviews = await prisma.review.findMany({
    where: { deletedAt: null },
    include: {
      patient: { include: { user: { select: { name: true } } } },
      clinic: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });
  if (reviews.length === 0) return null;

  return (
    <section className="container max-w-5xl py-8">
      <h2 className="text-xl font-bold mb-1">실제 환자 후기</h2>
      <p className="text-sm text-muted-foreground mb-4">치료 받은 분들의 솔직한 리뷰</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reviews.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                    {r.patient.user.name[0]}
                  </div>
                  <span className="text-sm font-medium">{maskName(r.patient.user.name)}</span>
                </div>
                <div className="flex items-center gap-0.5">
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
              <p className="text-sm line-clamp-3 text-foreground/80">{r.comment ?? "(리뷰 내용 없음)"}</p>
              <p className="text-xs text-muted-foreground mt-2">{timeAgo(r.createdAt)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// 실시간 견적 요청 (의사용 핵심, 비로그인 활동 증명)
// ============================================================
async function LiveRequestsSection({ isDentist }: { isDentist: boolean }) {
  const requests = await prisma.quotationRequest.findMany({
    where: { status: "OPEN", deletedAt: null },
    include: {
      missingTeeth: true,
      patient: { include: { user: { select: { name: true } } } },
      _count: { select: { quotations: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  if (requests.length === 0) return null;

  const URGENCY_LABEL: Record<string, { label: string; className: string }> = {
    LOW: { label: "여유", className: "bg-gray-100 text-gray-700" },
    MEDIUM: { label: "보통", className: "bg-amber-100 text-amber-700" },
    HIGH: { label: "시급", className: "bg-red-100 text-red-700" },
  };

  return (
    <section className="bg-muted/30 border-y">
      <div className="container max-w-5xl py-8">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">실시간 견적 요청</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              방금 올라온 환자분들의 요청
            </p>
          </div>
          {isDentist && (
            <Link
              href="/dentist/quotation-requests/available"
              className="text-sm text-blue-600 hover:underline whitespace-nowrap"
            >
              전체보기 →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {requests.map((r) => {
            const urg = URGENCY_LABEL[r.urgency];
            const cardContent = (
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-sm font-medium">
                      {maskName(r.patient.user.name)} 님 · 치아 {r.missingTeeth.length}개
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${urg.className}`}>
                      {urg.label}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2 text-foreground/70 min-h-[2.5rem]">
                    {r.symptoms ?? "(증상 미입력)"}
                  </p>
                  <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-muted-foreground">
                    <span>{timeAgo(r.createdAt)}</span>
                    <span>견적 {r._count.quotations}건</span>
                  </div>
                </CardContent>
              </Card>
            );
            return isDentist ? (
              <Link key={r.id} href={`/dentist/quotation-requests/${r.id}`}>
                {cardContent}
              </Link>
            ) : (
              <div key={r.id}>{cardContent}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// 이용 안내 (비로그인만)
// ============================================================
function HowItWorks() {
  return (
    <section className="container max-w-5xl py-12">
      <h2 className="text-xl font-bold text-center mb-8">이렇게 이용하세요</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HowCard step="1" title="요청 작성" desc="치아 위치, 증상, 사진" />
        <HowCard step="2" title="견적 비교" desc="여러 치과의 견적서" />
        <HowCard step="3" title="상담 예약" desc="원하는 곳과 일정" />
        <HowCard step="4" title="치료 + 리뷰" desc="치료 후 후기" />
      </div>
    </section>
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
