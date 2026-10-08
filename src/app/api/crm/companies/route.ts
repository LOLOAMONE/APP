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

export const GET = withErrorHandling(async () => {
  const session = await requireCrmAccess();
  const companies = await prisma.crmCompany.findMany({
    where: { restaurantId: session.activeRestaurantId },
    orderBy: { name: "asc" },
    include: { contacts: true, opportunities: true },
  });
  return NextResponse.json(companies);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireCrmAccess();
  const { profile, ...data } = companySchema.parse(await req.json());
  const company = await prisma.crmCompany.create({ data: { ...data, profile: JSON.stringify(profile ?? {}), restaurantId: session.activeRestaurantId } });
  return NextResponse.json(company, { status: 201 });
});
