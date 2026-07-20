import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireActiveRestaurant } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const reorderSchema = z.object({
  types: z.array(z.string().min(1)).min(1),
});

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const session = await requireActiveRestaurant();
  const { types } = reorderSchema.parse(await req.json());

  await prisma.$transaction(
    types.map((type, index) =>
      prisma.dashboardWidget.upsert({
        where: { userId_restaurantId_type: { userId: session.sub, restaurantId: session.activeRestaurantId, type } },
        update: { order: index },
        create: { userId: session.sub, restaurantId: session.activeRestaurantId, type, order: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
});
