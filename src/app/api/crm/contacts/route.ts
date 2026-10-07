import { NextRequest, NextResponse } from "next/server";
import { checkCustomValues } from "@/lib/contactCustomValues";
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
  return NextResponse.json(contacts.map((c) => ({ ...c, customValues: JSON.parse(c.customValues) })));
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireCrmAccess();
  const data = contactSchema.parse(await req.json());
  const customError = await checkCustomValues(session.activeRestaurantId!, data.customValues);
  if (customError) return NextResponse.json({ error: customError }, { status: 400 });
  if (data.companyId && !await prisma.crmCompany.findFirst({ where: { id: data.companyId, restaurantId: session.activeRestaurantId } })) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
  const contact = await prisma.crmContact.create({
    data: { ...data, customValues: JSON.stringify(data.customValues ?? {}), restaurantId: session.activeRestaurantId },
    include: { company: true },
  });
  return NextResponse.json({ ...contact, customValues: JSON.parse(contact.customValues) }, { status: 201 });
});
