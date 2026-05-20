import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "예약됨", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "완료", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "취소", className: "bg-gray-100 text-gray-500" },
  NO_SHOW: { label: "노쇼", className: "bg-red-100 text-red-700" },
};

export default async function DentistAppointmentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DENTIST") return null;

  const list = await prisma.consultation.findMany({
    where: { dentistId: session.user.id },
    include: {
      patient: {
        include: { user: { select: { name: true, phoneNumber: true } } },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  // 날짜별 그룹화
  const groups = new Map<string, typeof list>();
  for (const c of list) {
    const key = new Date(c.scheduledAt).toLocaleDateString("ko-KR");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  return (
    <main className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold mb-6">상담 일정</h1>

      {list.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            예약된 상담이 없습니다
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([date, items]) => (
            <section key={date}>
              <h2 className="text-lg font-semibold mb-2">{date}</h2>
              <div className="space-y-2">
                {items.map((c) => {
                  const status = STATUS_LABEL[c.status];
                  return (
                    <Card key={c.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">
                              {new Date(c.scheduledAt).toLocaleTimeString("ko-KR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              · {c.patient.user.name}
                            </CardTitle>
                            <CardDescription>
                              {c.duration}분 · {c.patient.user.phoneNumber ?? "전화 미등록"}
                            </CardDescription>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                      </CardHeader>
                      {c.notes && (
                        <CardContent className="pt-0 text-base text-muted-foreground">
                          메모: {c.notes}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
