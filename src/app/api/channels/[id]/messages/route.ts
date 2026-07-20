import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireActiveRestaurant } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const createMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireActiveRestaurant();
  const data = createMessageSchema.parse(await req.json());

  const channel = await prisma.channel.findUnique({ where: { id: params.id } });
  if (!channel || channel.restaurantId !== session.activeRestaurantId) {
    return NextResponse.json({ error: "Canal introuvable" }, { status: 404 });
  }

  const message = await prisma.channelMessage.create({
    data: { channelId: channel.id, senderId: session.sub, content: data.content },
    include: { sender: { select: { id: true, username: true } } },
  });
  return NextResponse.json(message, { status: 201 });
});
