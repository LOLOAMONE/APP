import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireActiveRestaurant, requireTicketAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { TICKET_STATUSES } from "@/lib/tickets";

const DEFAULT_PAGE_SIZE = 20;

const createTicketSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  category: z.string().trim().min(1).max(60).optional().nullable(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await requireTicketAccess();
  const searchParams = req.nextUrl.searchParams;

  const statusParam = searchParams.get("status");
  const status = statusParam && (TICKET_STATUSES as readonly string[]).includes(statusParam) ? statusParam : undefined;

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE));

  const where: Prisma.TicketWhereInput = { ...(status ? { status } : {}) };
  if (session.ticketScope.global) {
    const restaurantId = searchParams.get("restaurantId");
    if (restaurantId) where.restaurantId = restaurantId;
  } else {
    where.restaurantId = session.ticketScope.restaurantId;
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        restaurant: { select: { id: true, name: true } },
        createdBy: { select: { id: true, username: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  return NextResponse.json({ tickets, total, page, pageSize });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireActiveRestaurant();
  const data = createTicketSchema.parse(await req.json());

  const ticket = await prisma.ticket.create({
    data: {
      restaurantId: session.activeRestaurantId,
      subject: data.subject,
      description: data.description,
      category: data.category || null,
      createdByUserId: session.sub,
    },
    include: {
      restaurant: { select: { id: true, name: true } },
      createdBy: { select: { id: true, username: true } },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(ticket, { status: 201 });
});
