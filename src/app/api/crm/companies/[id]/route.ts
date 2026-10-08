import { companyProfileSchema } from "@/lib/companyProfile";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCrmAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const companySchema = z.object({
  name: z.string().trim().min(1).max(200),
  profile: companyProfileSchema.optional(),
  sector: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireCrmAccess();
    const { profile, ...data } = companySchema.parse(await req.json());
    const existing = await prisma.crmCompany.findUnique({ where: { id: params.id } });
    if (!existing || existing.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
    }
    const company = await prisma.crmCompany.update({ where: { id: params.id }, data: { ...data, ...(profile ? { profile: JSON.stringify({ ...JSON.parse(existing.profile), ...profile }) } : {}) } });
    return NextResponse.json(company);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireCrmAccess();
    const existing = await prisma.crmCompany.findUnique({ where: { id: params.id } });
    if (!existing || existing.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
    }
    await prisma.crmCompany.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
