import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveRestaurant } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

export const GET = withErrorHandling(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireActiveRestaurant();
  const channel = await prisma.channel.findUnique({
    where: { id: params.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, username: true } } },
      },
    },
  });
  if (!channel || channel.restaurantId !== session.activeRestaurantId) {
    return NextResponse.json({ error: "Canal introuvable" }, { status: 404 });
  }
  return NextResponse.json(channel);
});
