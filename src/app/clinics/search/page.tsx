"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useNaverMap } from "@/hooks/useNaverMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup } from "@/components/ui/toggle-group";

interface Clinic {
  id: string;
  name: string;
  phoneNumber: string | null;
  sido: string | null;
  sigungu: string | null;
  dong: string | null;
  latitude: number;
  longitude: number;
  rating: number | string;
  reviewCount: number;
  isPremium: boolean;
  hasParking: boolean;
  priceRange: string | null;
  distance: number;
  implantBrands: { brandName: string }[];
}

const POPULAR_BRANDS = ["오스템", "스트라우만", "노벨", "덴티스", "메가젠"];

export default function ClinicSearchPage() {
  const { containerRef, ready, clearMarkers, addMarker, panTo } = useNaverMap();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 필터 상태
  const [radius, setRadius] = useState(5);
  const [minRating, setMinRating] = useState(0);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>("");
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [parkingOnly, setParkingOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "reviews">("distance");

  useEffect(() => {
    if (!navigator.geolocation) {
      setCenter({ lat: 37.5666, lng: 126.9784 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCenter({ lat: 37.5666, lng: 126.9784 }),
      { timeout: 5000 },
    );
  }, []);

  useEffect(() => {
    if (!center) return;
    void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);

  async function search() {
    if (!center) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: String(center.lat),
        lng: String(center.lng),
        radius: String(radius),
        sortBy,
      });
      if (minRating > 0) params.set("minRating", String(minRating));
      if (priceRange) params.set("priceRange", priceRange);
      if (premiumOnly) params.set("premium", "true");
      if (parkingOnly) params.set("hasParking", "true");
      selectedBrands.forEach((b) => params.append("brand", b));

      const res = await fetch(`/api/clinics/search?${params}`);
      const list: Clinic[] = await res.json();
      setClinics(list);
      if (ready) {
        clearMarkers();
        list.forEach((c) =>
          addMarker(c.latitude, c.longitude, () => setSelectedId(c.id)),
        );
        panTo(center.lat, center.lng);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready && clinics.length > 0) {
      clearMarkers();
      clinics.forEach((c) =>
        addMarker(c.latitude, c.longitude, () => setSelectedId(c.id)),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <main className="container max-w-6xl py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">치과 찾기</h1>
        <p className="text-sm text-muted-foreground">현재 위치 주변의 치과를 검색하세요</p>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">반경 (km)</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-24"
              />
            </div>
            <Button onClick={search} disabled={loading} className="ml-auto">
              {loading ? "검색 중..." : "검색"}
            </Button>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">최소 평점</label>
            <ToggleGroup
              size="sm"
              options={[
                { value: "0", label: "전체" },
                { value: "3", label: "3점 이상" },
                { value: "4", label: "4점 이상" },
                { value: "4.5", label: "4.5점 이상" },
              ]}
              value={String(minRating)}
              onChange={(v) => v && setMinRating(Number(v))}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">가격대</label>
            <ToggleGroup
              size="sm"
              clearable
              options={[
                { value: "LOW", label: "저가형" },
                { value: "MEDIUM", label: "중가형" },
                { value: "HIGH", label: "고가형" },
                { value: "PREMIUM", label: "프리미엄" },
              ]}
              value={priceRange || null}
              onChange={(v) => setPriceRange(v ?? "")}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">정렬</label>
            <ToggleGroup<"distance" | "rating" | "reviews">
              size="sm"
              options={[
                { value: "distance", label: "가까운 순" },
                { value: "rating", label: "평점 높은 순" },
                { value: "reviews", label: "리뷰 많은 순" },
              ]}
              value={sortBy}
              onChange={(v) => v && setSortBy(v)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">임플란트 브랜드 (다중 선택)</label>
            <ToggleGroup
              size="sm"
              multi
              options={POPULAR_BRANDS.map((b) => ({ value: b, label: b }))}
              value={selectedBrands}
              onChange={setSelectedBrands}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">옵션</label>
            <ToggleGroup
              size="sm"
              multi
              options={[
                { value: "premium", label: "프리미엄만" },
                { value: "parking", label: "주차 가능" },
              ]}
              value={[
                ...(premiumOnly ? ["premium"] : []),
                ...(parkingOnly ? ["parking"] : []),
              ]}
              onChange={(arr) => {
                setPremiumOnly(arr.includes("premium"));
                setParkingOnly(arr.includes("parking"));
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {clinics.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                {loading ? "검색 중..." : "조건에 맞는 치과가 없습니다"}
              </CardContent>
            </Card>
          ) : (
            clinics.map((c) => (
              <Card
                key={c.id}
                className={`cursor-pointer transition-shadow ${
                  selectedId === c.id ? "ring-2 ring-primary shadow-md" : "hover:shadow-md"
                }`}
                onClick={() => {
                  setSelectedId(c.id);
                  panTo(c.latitude, c.longitude);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{c.name}</h3>
                        {c.isPremium && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                            프리미엄
                          </span>
                        )}
                        {c.hasParking && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                            주차
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.sido} {c.sigungu} {c.dong} · {c.distance.toFixed(1)}km
                      </p>
                      <p className="text-xs text-muted-foreground">
                        평점 {Number(c.rating).toFixed(1)} ({c.reviewCount}) ·{" "}
                        {c.implantBrands.map((b) => b.brandName).join(", ") || "-"}
                      </p>
                    </div>
                    <Link href={`/clinics/${c.id}`}>
                      <Button variant="outline" size="sm">
                        상세
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <div
            ref={containerRef}
            className="w-full h-[500px] lg:h-[600px] rounded-lg border bg-muted"
          />
          {!ready && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
                ? "지도 로딩 중..."
                : "네이버 지도 API 키가 설정되지 않았습니다 (NEXT_PUBLIC_NAVER_MAP_CLIENT_ID)"}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
