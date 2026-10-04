import { NextRequest, NextResponse } from "next/server";
import { singleShiftSchema } from "@/lib/shiftValidation";
import { checkShiftConflicts } from "@/lib/shiftWrites";
import { prisma } from "@/lib/db";
import { requireActiveRestaurant, requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

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
  const data = singleShiftSchema.parse(await req.json());
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findFirst({ where: { id: data.employeeId, restaurantId: session.activeRestaurantId } });
    if (!employee) return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    const error = await checkShiftConflicts(tx, [data]);
    if (error) return NextResponse.json({ error }, { status: 409 });
    const shift = await tx.shift.create({ data });
    return NextResponse.json(shift, { status: 201 });
  });
});
