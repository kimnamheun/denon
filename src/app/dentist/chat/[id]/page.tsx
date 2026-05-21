import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ChatRoom } from "@/components/chat/chat-room";

export default async function DentistChatRoomPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect(`/auth/login?redirect=/dentist/chat/${params.id}`);
  if (session.user.role !== "DENTIST") redirect("/");

  const room = await prisma.chatRoom.findUnique({
    where: { id: params.id },
    include: {
      patient: { include: { user: { select: { name: true } } } },
    },
  });

  if (!room || room.deletedAt || room.dentistId !== session.user.id) notFound();

  return (
    <main className="container max-w-3xl py-6">
      <Link href="/dentist/chat" className="text-base text-muted-foreground hover:underline">
        ← 상담 목록으로
      </Link>

      <div className="mt-4">
        <ChatRoom
          roomId={room.id}
          counterpartName={`환자: ${room.patient.user.name}`}
        />
      </div>
    </main>
  );
}
