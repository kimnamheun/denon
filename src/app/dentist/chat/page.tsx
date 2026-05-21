import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

export default async function DentistChatListPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?redirect=/dentist/chat");
  if (session.user.role !== "DENTIST") redirect("/");

  const rooms = await prisma.chatRoom.findMany({
    where: { dentistId: session.user.id, deletedAt: null },
    include: {
      patient: { include: { user: { select: { name: true } } } },
      _count: {
        select: {
          messages: {
            where: { readAt: null, senderRole: "PATIENT" },
          },
        },
      },
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return (
    <main className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold mb-6">환자 상담 문의</h1>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p className="text-base">아직 받은 상담 문의가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rooms.map((r) => {
            const unread = r._count.messages;
            return (
              <Link key={r.id} href={`/dentist/chat/${r.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-5 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-bold truncate">
                        환자: {r.patient.user.name}
                      </div>
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
