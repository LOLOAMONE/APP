import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireActiveRestaurant, requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

const shiftSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(dateRegex),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await requireActiveRestaurant();
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const shifts = await prisma.shift.findMany({
    where: {
      employee: { restaurantId: session.activeRestaurantId },
      ...(start && end ? { date: { gte: start, lte: end } } : {}),
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(shifts);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireAdmin();
  const data = shiftSchema.parse(await req.json());

  if (data.endTime <= data.startTime) {
    return NextResponse.json(
      { error: "L'heure de fin doit être après l'heure de début" },
      { status: 400 }
    );
  }

  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
  if (!employee || employee.restaurantId !== session.activeRestaurantId) {
    return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
  }

  const shift = await prisma.shift.create({ data });
  return NextResponse.json(shift, { status: 201 });
});
