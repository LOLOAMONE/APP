import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { batchShiftSchema } from "@/lib/shiftValidation";
import { checkShiftConflicts } from "@/lib/shiftWrites";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireAdmin();
  const { employeeId, dates, slots } = batchShiftSchema.parse(await req.json());
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findFirst({ where: { id: employeeId, restaurantId: session.activeRestaurantId } });
    if (!employee) return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    const candidates = dates.flatMap((date) => slots.map((slot) => ({ employeeId, date, ...slot })));
    const error = await checkShiftConflicts(tx, candidates);
    if (error) return NextResponse.json({ error }, { status: 409 });
    const result = await tx.shift.createMany({ data: candidates });
    return NextResponse.json({ created: result.count }, { status: 201 });
  });
});
