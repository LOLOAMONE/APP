import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMarketingAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { COUPON_DISCOUNT_TYPES, canManageNetworkResource } from "@/lib/marketing";

const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(40),
  discountType: z.enum(COUPON_DISCOUNT_TYPES),
  discountValue: z.number().nonnegative().optional().nullable(),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireMarketingAccess();
  const data = createCouponSchema.parse(await req.json());

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!campaign) return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  if (!canManageNetworkResource(session, campaign.restaurantId)) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const existingCode = await prisma.coupon.findUnique({ where: { code: data.code } });
  if (existingCode) {
    return NextResponse.json({ error: "Ce code existe déjà" }, { status: 409 });
  }

  const coupon = await prisma.coupon.create({
    data: {
      campaignId: campaign.id,
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue ?? null,
      maxRedemptions: data.maxRedemptions ?? null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });
  return NextResponse.json(coupon, { status: 201 });
});
