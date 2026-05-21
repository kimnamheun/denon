import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ChatRoom } from "@/components/chat/chat-room";

export default async function PatientChatRoomPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect(`/auth/login?redirect=/patient/chat/${params.id}`);
  if (session.user.role !== "PATIENT") redirect("/");

  const room = await prisma.chatRoom.findUnique({
    where: { id: params.id },
    include: {
      dentist: {
        include: {
          user: { select: { name: true } },
          clinic: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!room || room.deletedAt || room.patientId !== session.user.id) notFound();

  const sub = room.dentist.clinic?.name;

  return (
    <main className="container max-w-3xl py-6">
      <Link href="/patient/chat" className="text-base text-muted-foreground hover:underline">
        ← 상담 목록으로
      </Link>

      <div className="mt-4">
        <ChatRoom
          roomId={room.id}
          counterpartName={`${room.dentist.user.name} 의사선생님`}
          counterpartSub={sub}
        />
      </div>
    </main>
  );
}
