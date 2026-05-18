import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "예약됨", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "완료", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "취소", className: "bg-gray-100 text-gray-500" },
  NO_SHOW: { label: "노쇼", className: "bg-red-100 text-red-700" },
};

export default async function PatientAppointmentsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const list = await prisma.consultation.findMany({
    where: { patientId: session.user.id },
    include: {
      dentist: { include: { user: { select: { name: true } } } },
      clinic: { select: { id: true, name: true, sido: true, sigungu: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  return (
    <main className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold mb-6">내 예약</h1>

      {list.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            예약된 상담이 없습니다
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const status = STATUS_LABEL[c.status];
            return (
              <Link key={c.id} href={`/patient/appointments/${c.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{c.clinic.name}</CardTitle>
                        <CardDescription>
                          {c.dentist.user.name} 원장 · {c.clinic.sido} {c.clinic.sigungu}
                        </CardDescription>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <span className="font-medium">
                        {new Date(c.scheduledAt).toLocaleString("ko-KR")}
                      </span>{" "}
                      <span className="text-muted-foreground">({c.duration}분)</span>
                    </div>
                    {c.notes && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{c.notes}</p>}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
