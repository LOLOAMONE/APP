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
  stage: z.enum(STAGES).default("PROSPECT"),
  eventDate: z.string().optional().nullable(),
  guestCount: z.number().int().nonnegative().optional().nullable(),
  amount: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const opportunityInclude = { company: true, contact: true } as const;

export const GET = withErrorHandling(async () => {
  const session = await requireCrmAccess();
  const opportunities = await prisma.crmOpportunity.findMany({
    where: { restaurantId: session.activeRestaurantId },
    orderBy: { order: "asc" },
    include: opportunityInclude,
  });
  return NextResponse.json(opportunities);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireCrmAccess();
  const data = opportunitySchema.parse(await req.json());
  const last = await prisma.crmOpportunity.findFirst({
    where: { stage: data.stage, restaurantId: session.activeRestaurantId },
    orderBy: { order: "desc" },
  });
  const opportunity = await prisma.crmOpportunity.create({
    data: { ...data, restaurantId: session.activeRestaurantId, order: (last?.order ?? -1) + 1 },
    include: opportunityInclude,
  });
  return NextResponse.json(opportunity, { status: 201 });
});
