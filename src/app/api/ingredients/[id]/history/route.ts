import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMargesAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireMargesAccess();
    const ingredient = await prisma.ingredient.findUnique({ where: { id: params.id } });
    if (!ingredient || ingredient.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Ingrédient introuvable" }, { status: 404 });
    }
    const history = await prisma.ingredientPriceHistory.findMany({
      where: { ingredientId: params.id },
      orderBy: { recordedAt: "desc" },
    });
    return NextResponse.json(history);
  }
);
