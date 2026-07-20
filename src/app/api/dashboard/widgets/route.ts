import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveRestaurant } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { DASHBOARD_WIDGET_CATALOG } from "@/lib/dashboard";

export const GET = withErrorHandling(async () => {
  const session = await requireActiveRestaurant();
  const saved = await prisma.dashboardWidget.findMany({
    where: { userId: session.sub, restaurantId: session.activeRestaurantId },
  });
  const savedByType = new Map(saved.map((w) => [w.type, w]));

  const widgets = DASHBOARD_WIDGET_CATALOG.map((w, index) => {
    const s = savedByType.get(w.type);
    return { type: w.type, label: w.label, order: s?.order ?? index, visible: s?.visible ?? true };
  }).sort((a, b) => a.order - b.order);

  return NextResponse.json(widgets);
});
