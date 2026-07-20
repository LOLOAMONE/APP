import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireMarketingAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { CAMPAIGN_SCOPES, CAMPAIGN_STATUSES } from "@/lib/marketing";

const createCampaignSchema = z.object({
  scope: z.enum(CAMPAIGN_SCOPES),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  budget: z.number().nonnegative().optional().nullable(),
  allRestaurants: z.boolean().default(true),
  targetRestaurantIds: z.array(z.string()).optional(),
});

const campaignInclude = {
  restaurant: { select: { id: true, name: true } },
  createdBy: { select: { id: true, username: true } },
  targets: { include: { restaurant: { select: { id: true, name: true } } } },
  _count: { select: { coupons: true } },
};

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await requireMarketingAccess();
  const searchParams = req.nextUrl.searchParams;
  const statusParam = searchParams.get("status");
  const status = statusParam && (CAMPAIGN_STATUSES as readonly string[]).includes(statusParam) ? statusParam : undefined;

  let where: Prisma.CampaignWhereInput;
  if (session.marketingScope.global) {
    const restaurantId = searchParams.get("restaurantId");
    where = { ...(status ? { status } : {}), ...(restaurantId ? { restaurantId } : {}) };
  } else {
    const restaurantId = session.marketingScope.restaurantId;
    where = {
      ...(status ? { status } : {}),
      OR: [
        { scope: "LOCAL", restaurantId },
        { scope: "NATIONAL", allRestaurants: true },
        { scope: "NATIONAL", allRestaurants: false, targets: { some: { restaurantId } } },
      ],
    };
  }

  const campaigns = await prisma.campaign.findMany({ where, orderBy: { createdAt: "desc" }, include: campaignInclude });
  return NextResponse.json(campaigns);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireMarketingAccess();
  const data = createCampaignSchema.parse(await req.json());

  if (data.scope === "NATIONAL" && !session.marketingScope.global) {
    return NextResponse.json({ error: "Seule la maison mère peut créer une campagne nationale" }, { status: 403 });
  }

  let restaurantId: string | null = null;
  if (data.scope === "LOCAL") {
    restaurantId = session.marketingScope.global ? session.activeRestaurantId : session.marketingScope.restaurantId;
    if (!restaurantId) {
      return NextResponse.json({ error: "Sélectionnez un restaurant pour créer une campagne locale" }, { status: 409 });
    }
  }

  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.campaign.create({
      data: {
        scope: data.scope,
        restaurantId,
        name: data.name,
        description: data.description || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        budget: data.budget ?? null,
        allRestaurants: data.scope === "NATIONAL" ? data.allRestaurants : true,
        createdByUserId: session.sub,
      },
    });
    if (data.scope === "NATIONAL" && !data.allRestaurants && data.targetRestaurantIds?.length) {
      await tx.campaignRestaurant.createMany({
        data: data.targetRestaurantIds.map((targetId) => ({ campaignId: created.id, restaurantId: targetId })),
      });
    }
    return tx.campaign.findUniqueOrThrow({ where: { id: created.id }, include: campaignInclude });
  });

  return NextResponse.json(campaign, { status: 201 });
});
