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

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    await requireCrmAccess();
    const data = companySchema.parse(await req.json());
    const company = await prisma.crmCompany.update({ where: { id: params.id }, data });
    return NextResponse.json(company);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    await requireCrmAccess();
    await prisma.crmCompany.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
