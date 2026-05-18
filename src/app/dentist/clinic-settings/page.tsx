import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { ClinicRegisterForm } from "./register-form";
import { ClinicEditForm } from "./edit-form";

export default async function ClinicSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DENTIST") return null;

  const dentist = await prisma.dentist.findUnique({
    where: { id: session.user.id },
    include: {
      clinic: {
        include: {
          businessHours: true,
          implantBrands: true,
        },
      },
    },
  });

  if (!dentist?.clinic) {
    return (
      <main className="container max-w-2xl py-10">
        <h1 className="text-3xl font-bold mb-2">병원 등록</h1>
        <p className="text-muted-foreground mb-6">
          견적서 작성을 위해 먼저 병원을 등록해주세요
        </p>
        <ClinicRegisterForm />
      </main>
    );
  }

  return (
    <main className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold mb-2">병원 설정</h1>
      <p className="text-muted-foreground mb-6">{dentist.clinic.name}</p>
      <ClinicEditForm
        clinicId={dentist.clinic.id}
        initial={{
          name: dentist.clinic.name,
          phoneNumber: dentist.clinic.phoneNumber ?? "",
          description: dentist.clinic.description ?? "",
          sido: dentist.clinic.sido ?? "",
          sigungu: dentist.clinic.sigungu ?? "",
          dong: dentist.clinic.dong ?? "",
          detailAddress: dentist.clinic.detailAddress ?? "",
          latitude: dentist.clinic.latitude ? Number(dentist.clinic.latitude) : null,
          longitude: dentist.clinic.longitude ? Number(dentist.clinic.longitude) : null,
          hasParking: dentist.clinic.hasParking,
          priceRange: dentist.clinic.priceRange ?? null,
          implantBrands: dentist.clinic.implantBrands.map((b) => b.brandName),
          businessHours: dentist.clinic.businessHours.map((h) => ({
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime ?? "",
            closeTime: h.closeTime ?? "",
            isClosed: h.isClosed,
          })),
        }}
      />
    </main>
  );
}
