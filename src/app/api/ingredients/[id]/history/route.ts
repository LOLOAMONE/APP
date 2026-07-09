import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    await requireAdmin();
    const history = await prisma.ingredientPriceHistory.findMany({
      where: { ingredientId: params.id },
      orderBy: { recordedAt: "desc" },
    });
    return NextResponse.json(history);
  }
);
