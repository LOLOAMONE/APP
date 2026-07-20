import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMarketingAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const redeemSchema = z.object({
  amount: z.number().nonnegative().optional().nullable(),
});

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: { code: string } }) => {
  const session = await requireMarketingAccess();
  const data = redeemSchema.parse(await req.json().catch(() => ({})));

  const restaurantId = session.marketingScope.global ? session.activeRestaurantId : session.marketingScope.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "Sélectionnez un restaurant pour utiliser un coupon" }, { status: 409 });
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: params.code },
    include: { campaign: true, _count: { select: { redemptions: true } } },
  });
  if (!coupon) {
    return NextResponse.json({ error: "Coupon introuvable" }, { status: 404 });
  }

  const campaign = coupon.campaign;
  const usableHere =
    (campaign.scope === "LOCAL" && campaign.restaurantId === restaurantId) ||
    (campaign.scope === "NATIONAL" &&
      (campaign.allRestaurants ||
        (await prisma.campaignRestaurant.findUnique({
          where: { campaignId_restaurantId: { campaignId: campaign.id, restaurantId } },
        })) !== null));
  if (!usableHere) {
    return NextResponse.json({ error: "Ce coupon n'est pas valable dans ce restaurant" }, { status: 403 });
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return NextResponse.json({ error: "Ce coupon a expiré" }, { status: 400 });
  }
  if (coupon.maxRedemptions !== null && coupon._count.redemptions >= coupon.maxRedemptions) {
    return NextResponse.json({ error: "Ce coupon a atteint son nombre maximal d'utilisations" }, { status: 400 });
  }

  const redemption = await prisma.couponRedemption.create({
    data: { couponId: coupon.id, restaurantId, amount: data.amount ?? null },
  });
  return NextResponse.json(redemption, { status: 201 });
});
