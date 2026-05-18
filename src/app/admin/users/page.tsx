import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { UserRow } from "./user-row";
import { FilterForm } from "./filter-form";

interface SearchParams {
  q?: string;
  role?: string;
  status?: string;
  page?: string;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;

  const page = Math.max(1, Number(searchParams.page ?? "1"));
  const size = 20;

  const where: {
    deletedAt: null;
    role?: "PATIENT" | "DENTIST" | "ADMIN";
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    OR?: Array<{ email?: object; name?: object }>;
  } = { deletedAt: null };
  if (searchParams.role) where.role = searchParams.role as typeof where.role;
  if (searchParams.status) where.status = searchParams.status as typeof where.status;
  if (searchParams.q) {
    where.OR = [
      { email: { contains: searchParams.q, mode: "insensitive" } },
      { name: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        dentist: {
          select: {
            isVerified: true,
            specialization: true,
            clinic: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * size,
      take: size,
    }),
  ]);

  return (
    <main className="container py-10 space-y-4">
      <div>
        <h1 className="text-3xl font-bold">사용자 관리</h1>
        <p className="text-muted-foreground mt-1">총 {total.toLocaleString()}명</p>
      </div>

      <FilterForm />

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left p-3">이름</th>
                <th className="text-left p-3">이메일</th>
                <th className="text-left p-3">역할</th>
                <th className="text-left p-3">상태</th>
                <th className="text-left p-3">가입일</th>
                <th className="text-right p-3 pr-4">액션</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={{
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    status: u.status,
                    createdAt: u.createdAt.toISOString(),
                    isVerified: u.dentist?.isVerified,
                    specialization: u.dentist?.specialization,
                    clinicName: u.dentist?.clinic?.name,
                  }}
                  isSelf={u.id === session.user.id}
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Pagination total={total} page={page} size={size} params={searchParams} />
    </main>
  );
}

function Pagination({
  total,
  page,
  size,
  params,
}: {
  total: number;
  page: number;
  size: number;
  params: SearchParams;
}) {
  const pages = Math.ceil(total / size);
  if (pages <= 1) return null;

  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.role) sp.set("role", params.role);
  if (params.status) sp.set("status", params.status);
  const base = sp.toString();

  return (
    <div className="flex justify-center gap-1">
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <a
          key={p}
          href={`?${base}${base ? "&" : ""}page=${p}`}
          className={`px-3 py-1 text-sm rounded ${
            p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
        >
          {p}
        </a>
      ))}
    </div>
  );
}
