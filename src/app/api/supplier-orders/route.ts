import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMercurialeAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const schema = z.object({
  action: z.enum(["PREPARE", "ORDERED"]),
  items: z.array(z.object({ id: z.string().min(1), quantity: z.number().finite().positive().max(100000) })).max(500),
  clearIds: z.array(z.string().min(1)).max(500).default([]),
}).refine((v) => v.items.length + v.clearIds.length > 0 && new Set([...v.items.map((i) => i.id), ...v.clearIds]).size === v.items.length + v.clearIds.length, "Sélection vide ou articles dupliqués");

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireMercurialeAccess();
  const data = schema.parse(await req.json());
  const result = await prisma.$transaction(async (tx) => {
    const ids = [...data.items.map((i) => i.id), ...data.clearIds];
    const items = await tx.supplierItem.findMany({ where: { id: { in: ids }, supplier: { restaurantId: session.activeRestaurantId } } });
    if (items.length !== ids.length) return null;
    if (items.some((i) => i.orderedAt && !i.receivedAt)) return -1;
    if (data.action === "PREPARE" && data.clearIds.length) await tx.supplierItem.updateMany({ where: { id: { in: data.clearIds } }, data: { orderQuantity: 0 } });
    const orderedAt = new Date();
    for (const item of data.items) {
      await tx.supplierItem.update({ where: { id: item.id }, data: { orderQuantity: item.quantity, orderedAt: data.action === "ORDERED" ? orderedAt : null, receivedAt: null } });
    }
    return items.length;
  });
  if (result === -1) return NextResponse.json({ error: "Un article est déjà en attente de réception. Réceptionnez-le avant de préparer une nouvelle commande." }, { status: 409 });
  if (result === null) return NextResponse.json({ error: "Un article n’est plus disponible dans ce restaurant." }, { status: 404 });
  return NextResponse.json({ updated: result });
});
