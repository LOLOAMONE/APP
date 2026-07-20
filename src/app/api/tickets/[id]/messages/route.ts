import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTicketAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const createMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireTicketAccess();
  const data = createMessageSchema.parse(await req.json());

  const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
  if (!ticket || (!session.ticketScope.global && ticket.restaurantId !== session.ticketScope.restaurantId)) {
    return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.ticketMessage.create({
      data: { ticketId: ticket.id, senderId: session.sub, content: data.content },
      include: { sender: { select: { id: true, username: true } } },
    });
    await tx.ticket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } });
    return created;
  });

  return NextResponse.json(message, { status: 201 });
});
