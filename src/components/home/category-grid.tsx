import Link from "next/link";

import { CATEGORIES, getCategoryPrices, formatApproxPrice } from "@/lib/category-prices";

export async function CategoryGrid() {
  const prices = await getCategoryPrices();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {CATEGORIES.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          className="flex flex-col items-center text-center p-3 sm:p-4 rounded-lg border bg-card hover:shadow-md hover:border-primary/50 transition-all"
        >
          <div className="text-3xl mb-2">{c.emoji}</div>
          <div className="text-xs sm:text-sm font-semibold leading-tight">{c.title}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{c.desc}</div>
          <div className="mt-2 pt-2 border-t border-dashed w-full">
            <div className="text-[10px] sm:text-xs text-blue-600 font-semibold">
              {formatApproxPrice(prices[c.key] ?? 0)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
