"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/clinics/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-2 flex items-center gap-2"
    >
      <div className="flex items-center gap-2 flex-1 px-3">
        <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="지역, 병원명, 브랜드로 검색"
          className="flex-1 h-12 text-base outline-none bg-transparent"
        />
      </div>
      <Button type="submit" size="lg" className="rounded-xl">
        <Search className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">검색</span>
      </Button>
    </form>
  );
}
