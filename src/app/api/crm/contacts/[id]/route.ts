import { NextRequest, NextResponse } from "next/server";
import { checkCustomValues } from "@/lib/contactCustomValues";
import { contactSchema } from "@/lib/contactValidation";
import { prisma } from "@/lib/db";
import { requireCrmAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireCrmAccess();
    const data = contactSchema.parse(await req.json());
  const customError = await checkCustomValues(session.activeRestaurantId!, data.customValues);
  if (customError) return NextResponse.json({ error: customError }, { status: 400 });
    const existing = await prisma.crmContact.findUnique({ where: { id: params.id } });
    if (!existing || existing.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
    }
    if (data.companyId && !await prisma.crmCompany.findFirst({ where: { id: data.companyId, restaurantId: session.activeRestaurantId } })) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
    const { customValues, ...details } = data;
    const contact = await prisma.crmContact.update({ where: { id: params.id }, data: { ...details, ...(customValues ? { customValues: JSON.stringify({ ...JSON.parse(existing.customValues), ...customValues }) } : {}) }, include: { company: true } });
    return NextResponse.json({ ...contact, customValues: JSON.parse(contact.customValues) });
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireCrmAccess();
    const existing = await prisma.crmContact.findUnique({ where: { id: params.id } });
    if (!existing || existing.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
    }
    await prisma.crmContact.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
