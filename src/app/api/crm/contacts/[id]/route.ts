import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/contactValidation";
import { prisma } from "@/lib/db";
import { requireCrmAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireCrmAccess();
    const data = contactSchema.parse(await req.json());
    const existing = await prisma.crmContact.findUnique({ where: { id: params.id } });
    if (!existing || existing.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
    }
    if (data.companyId && !await prisma.crmCompany.findFirst({ where: { id: data.companyId, restaurantId: session.activeRestaurantId } })) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
    const contact = await prisma.crmContact.update({ where: { id: params.id }, data, include: { company: true } });
    return NextResponse.json(contact);
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
