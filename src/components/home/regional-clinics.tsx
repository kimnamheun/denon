"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup } from "@/components/ui/toggle-group";

interface Clinic {
  id: string;
  name: string;
  sido: string | null;
  sigungu: string | null;
  rating: number;
  reviewCount: number;
  isPremium: boolean;
  implantBrands: { brandName: string }[];
}

const REGIONS = [
  { value: "서울", label: "서울" },
  { value: "경기", label: "경기" },
  { value: "인천", label: "인천" },
  { value: "부산", label: "부산" },
  { value: "대구", label: "대구" },
  { value: "광주", label: "광주" },
  { value: "대전", label: "대전" },
];

export function RegionalClinics() {
  const [sido, setSido] = useState<string>("서울");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/clinics/by-region?sido=${encodeURIComponent(sido)}`)
      .then((r) => r.json())
      .then((data: Clinic[]) => {
        if (!cancelled) setClinics(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sido]);

  return (
    <section className="container max-w-5xl py-8">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5" /> 지역별 인기 치과
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">지역을 선택하면 상위 치과를 보여드려요</p>
        </div>
      </div>

      <div className="mb-4">
        <ToggleGroup
          size="sm"
          options={REGIONS}
          value={sido}
          onChange={(v) => v && setSido(v)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">불러오는 중...</p>
      ) : clinics.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {sido} 지역에 등록된 병원이 없습니다
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {clinics.map((c) => (
            <Link key={c.id} href={`/clinics/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold line-clamp-1">{c.name}</h3>
                    {c.isPremium && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                        광고
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{c.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground text-xs">
                      ({c.reviewCount}개 리뷰)
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
    </section>
  );
}
