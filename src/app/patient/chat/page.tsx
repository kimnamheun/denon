import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

export default async function PatientChatListPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?redirect=/patient/chat");
  if (session.user.role !== "PATIENT") redirect("/");

  const rooms = await prisma.chatRoom.findMany({
    where: { patientId: session.user.id, deletedAt: null },
    include: {
      dentist: {
        include: {
          user: { select: { name: true } },
          clinic: { select: { id: true, name: true } },
        },
      },
      _count: {
        select: {
          messages: {
            where: { readAt: null, senderRole: "DENTIST" },
          },
        },
      },
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return (
    <main className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold mb-6">상담 문의</h1>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p className="text-base">아직 진행 중인 상담이 없어요.</p>
            <p className="mt-2 text-sm">
              받은 견적서 화면에서 의사선생님께 문의를 시작할 수 있어요.
            </p>
            <Link
              href="/patient/quotations"
              className="mt-4 inline-block text-base font-semibold text-primary hover:underline"
            >
              받은 견적서 보기 →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rooms.map((r) => {
            const unread = r._count.messages;
            return (
              <Link key={r.id} href={`/patient/chat/${r.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-5 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-bold truncate">
                        {r.dentist.user.name} 의사선생님
                      </div>
                      {r.dentist.clinic && (
                        <div className="text-sm text-muted-foreground mt-0.5 truncate">
                          {r.dentist.clinic.name}
                        </div>
                      )}
                      {r.lastMessagePreview && (
                        <div className="mt-2 text-base text-muted-foreground line-clamp-1">
                          {r.lastMessagePreview}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {r.lastMessageAt && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.lastMessageAt).toLocaleString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                      {unread > 0 && (
                        <span className="inline-flex mt-2 min-w-[1.5rem] h-6 px-2 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </div>
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
