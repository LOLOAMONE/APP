import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCrmAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const companySchema = z.object({
  name: z.string().min(1),
  sector: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const GET = withErrorHandling(async () => {
  await requireCrmAccess();
  const companies = await prisma.crmCompany.findMany({
    orderBy: { name: "asc" },
    include: { contacts: true, opportunities: true },
  });
  return NextResponse.json(companies);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireCrmAccess();
  const data = companySchema.parse(await req.json());
  const company = await prisma.crmCompany.create({ data });
  return NextResponse.json(company, { status: 201 });
});
