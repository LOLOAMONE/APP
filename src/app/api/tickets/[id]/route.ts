import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireGlobalTicketAccess, requireTicketAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { TICKET_STATUSES } from "@/lib/tickets";

const ticketDetailInclude = {
  restaurant: { select: { id: true, name: true } },
  createdBy: { select: { id: true, username: true } },
  messages: {
    orderBy: { createdAt: "asc" as const },
    include: { sender: { select: { id: true, username: true } } },
  },
};

const updateStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});

export const GET = withErrorHandling(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireTicketAccess();
  const ticket = await prisma.ticket.findUnique({ where: { id: params.id }, include: ticketDetailInclude });
  if (!ticket || (!session.ticketScope.global && ticket.restaurantId !== session.ticketScope.restaurantId)) {
    return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
  }
  return NextResponse.json(ticket);
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await requireGlobalTicketAccess();
  const data = updateStatusSchema.parse(await req.json());

  const existing = await prisma.ticket.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
  }

  const ticket = await prisma.ticket.update({
    where: { id: params.id },
    data: { status: data.status },
    include: ticketDetailInclude,
  });
  return NextResponse.json(ticket);
});
