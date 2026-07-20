import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMarketingAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { CAMPAIGN_STATUSES, canManageNetworkResource } from "@/lib/marketing";

const campaignInclude = {
  restaurant: { select: { id: true, name: true } },
  createdBy: { select: { id: true, username: true } },
  targets: { include: { restaurant: { select: { id: true, name: true } } } },
  coupons: { include: { _count: { select: { redemptions: true } } } },
};

function visibleTo(
  session: Awaited<ReturnType<typeof requireMarketingAccess>>,
  campaign: { scope: string; restaurantId: string | null; allRestaurants: boolean; targets: { restaurantId: string }[] }
): boolean {
  if (session.marketingScope.global) return true;
  const restaurantId = session.marketingScope.restaurantId;
  if (campaign.scope === "LOCAL") return campaign.restaurantId === restaurantId;
  return campaign.allRestaurants || campaign.targets.some((t) => t.restaurantId === restaurantId);
}

export const GET = withErrorHandling(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireMarketingAccess();
  const campaign = await prisma.campaign.findUnique({ where: { id: params.id }, include: campaignInclude });
  if (!campaign || !visibleTo(session, campaign)) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }
  return NextResponse.json(campaign);
});

const updateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  budget: z.number().nonnegative().optional().nullable(),
});

export const PUT = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireMarketingAccess();
  const data = updateCampaignSchema.parse(await req.json());
  const existing = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  if (!canManageNetworkResource(session, existing.restaurantId)) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const campaign = await prisma.campaign.update({
    where: { id: params.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
      ...(data.budget !== undefined ? { budget: data.budget } : {}),
    },
    include: campaignInclude,
  });
  return NextResponse.json(campaign);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireMarketingAccess();
  const existing = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  if (!canManageNetworkResource(session, existing.restaurantId)) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }
  await prisma.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
