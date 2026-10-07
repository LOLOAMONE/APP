import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveRestaurant } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { workspaceAccess, workspaceSchema } from "@/lib/workspace";

export const PUT = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireActiveRestaurant();
  const existing = await prisma.workspaceItem.findFirst({ where: { id: params.id, restaurantId: session.activeRestaurantId } });
  if (!existing) return NextResponse.json({ error: "Élément introuvable" }, { status: 404 });
  await workspaceAccess(existing.area);
  const data = workspaceSchema.parse(await req.json());
  if (data.area !== existing.area) return NextResponse.json({ error: "L’espace ne peut pas être changé" }, { status: 400 });
  const item = await prisma.workspaceItem.update({ where: { id: existing.id }, data });
  return NextResponse.json(item);
});
