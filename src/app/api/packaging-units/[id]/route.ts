import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMercurialeAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireMercurialeAccess();
    const existing = await prisma.packagingUnit.findUnique({ where: { id: params.id } });
    if (!existing || existing.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Conditionnement introuvable" }, { status: 404 });
    }
    await prisma.packagingUnit.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
