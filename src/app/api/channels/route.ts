import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireActiveRestaurant } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const createChannelSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const GET = withErrorHandling(async () => {
  const session = await requireActiveRestaurant();
  const channels = await prisma.channel.findMany({
    where: { restaurantId: session.activeRestaurantId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { messages: true } } },
  });
  return NextResponse.json(channels);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireActiveRestaurant();
  const data = createChannelSchema.parse(await req.json());

  const existing = await prisma.channel.findUnique({
    where: { restaurantId_name: { restaurantId: session.activeRestaurantId, name: data.name } },
  });
  if (existing) {
    return NextResponse.json({ error: "Un canal porte déjà ce nom" }, { status: 409 });
  }

  const channel = await prisma.channel.create({
    data: { name: data.name, restaurantId: session.activeRestaurantId },
    include: { _count: { select: { messages: true } } },
  });
  return NextResponse.json(channel, { status: 201 });
});
