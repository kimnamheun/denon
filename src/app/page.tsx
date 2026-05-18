import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-10">
      <section className="text-center max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          치과 임플란트 견적, <br />
          쉽고 투명하게 비교하세요
        </h1>
        <p className="text-muted-foreground text-lg">
          여러 치과의 임플란트 견적을 한 번에 받아 비교하고, 가장 적합한 곳을 선택하세요.
        </p>
      </section>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/auth/register">
          <Button size="lg">회원가입</Button>
        </Link>
        <Link href="/auth/login">
          <Button size="lg" variant="outline">
            로그인
          </Button>
        </Link>
        <Link href="/clinics/search">
          <Button size="lg" variant="ghost">
            치과 둘러보기
          </Button>
        </Link>
      </div>
    </main>
  );
}
