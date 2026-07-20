import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireActiveRestaurant } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { DASHBOARD_WIDGET_CATALOG } from "@/lib/dashboard";

const patchSchema = z.object({ visible: z.boolean() });

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: { type: string } }) => {
  const session = await requireActiveRestaurant();
  const data = patchSchema.parse(await req.json());

  const catalogIndex = DASHBOARD_WIDGET_CATALOG.findIndex((w) => w.type === params.type);
  if (catalogIndex === -1) {
    return NextResponse.json({ error: "Widget inconnu" }, { status: 404 });
  }

  await prisma.dashboardWidget.upsert({
    where: {
      userId_restaurantId_type: { userId: session.sub, restaurantId: session.activeRestaurantId, type: params.type },
    },
    update: { visible: data.visible },
    create: {
      userId: session.sub,
      restaurantId: session.activeRestaurantId,
      type: params.type,
      visible: data.visible,
      order: catalogIndex,
    },
  });

  return NextResponse.json({ ok: true });
});
