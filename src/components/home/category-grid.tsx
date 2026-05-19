import Link from "next/link";

interface Category {
  emoji: string;
  title: string;
  desc: string;
  href: string;
}

const CATEGORIES: Category[] = [
  { emoji: "🦷", title: "단일 임플란트", desc: "치아 1~2개", href: "/patient/quotation-requests/new?category=single" },
  { emoji: "🪥", title: "다수 임플란트", desc: "치아 3개 이상", href: "/patient/quotation-requests/new?category=multi" },
  { emoji: "😬", title: "전체 임플란트", desc: "전악 임플란트", href: "/patient/quotation-requests/new?category=full" },
  { emoji: "✨", title: "심미 임플란트", desc: "앞니 임플란트", href: "/patient/quotation-requests/new?category=cosmetic" },
  { emoji: "🩹", title: "당일 임플란트", desc: "발치 즉시 식립", href: "/patient/quotation-requests/new?category=immediate" },
  { emoji: "🦴", title: "뼈이식 임플란트", desc: "골이식 동반", href: "/patient/quotation-requests/new?category=bone-graft" },
];

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {CATEGORIES.map((c) => (
        <Link
          key={c.title}
          href={c.href}
          className="flex flex-col items-center text-center p-3 sm:p-4 rounded-lg border bg-card hover:shadow-md hover:border-primary/50 transition-all"
        >
          <div className="text-3xl mb-2">{c.emoji}</div>
          <div className="text-xs sm:text-sm font-semibold leading-tight">{c.title}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{c.desc}</div>
        </Link>
      ))}
    </div>
  );
}
