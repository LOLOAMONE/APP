import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCrmAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { STAGES } from "@/lib/crm";

const opportunitySchema = z.object({
  title: z.string().min(1),
  companyId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  stage: z.enum(STAGES),
  eventDate: z.string().optional().nullable(),
  guestCount: z.number().int().nonnegative().optional().nullable(),
  amount: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const opportunityInclude = { company: true, contact: true } as const;

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    await requireCrmAccess();
    const data = opportunitySchema.parse(await req.json());
    const opportunity = await prisma.crmOpportunity.update({
      where: { id: params.id },
      data,
      include: opportunityInclude,
    });
    return NextResponse.json(opportunity);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    await requireCrmAccess();
    await prisma.crmOpportunity.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
