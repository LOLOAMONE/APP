import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/contactValidation";
import { prisma } from "@/lib/db";
import { requireCrmAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

export const GET = withErrorHandling(async () => {
  const session = await requireCrmAccess();
  const contacts = await prisma.crmContact.findMany({
    where: { restaurantId: session.activeRestaurantId },
    orderBy: { name: "asc" },
    include: { company: true },
  });
  return NextResponse.json(contacts);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireCrmAccess();
  const data = contactSchema.parse(await req.json());
  if (data.companyId && !await prisma.crmCompany.findFirst({ where: { id: data.companyId, restaurantId: session.activeRestaurantId } })) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
  const contact = await prisma.crmContact.create({
    data: { ...data, restaurantId: session.activeRestaurantId },
    include: { company: true },
  });
  return NextResponse.json(contact, { status: 201 });
});
