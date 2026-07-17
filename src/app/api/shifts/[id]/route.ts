import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

const shiftSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(dateRegex),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
});

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAdmin();
    const data = shiftSchema.parse(await req.json());

    if (data.endTime <= data.startTime) {
      return NextResponse.json(
        { error: "L'heure de fin doit être après l'heure de début" },
        { status: 400 }
      );
    }

    const existing = await prisma.shift.findUnique({ where: { id: params.id }, include: { employee: true } });
    if (!existing || existing.employee.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Créneau introuvable" }, { status: 404 });
    }

    const shift = await prisma.shift.update({ where: { id: params.id }, data });
    return NextResponse.json(shift);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAdmin();
    const existing = await prisma.shift.findUnique({ where: { id: params.id }, include: { employee: true } });
    if (!existing || existing.employee.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Créneau introuvable" }, { status: 404 });
    }
    await prisma.shift.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
