import { NextRequest, NextResponse } from "next/server";
import { singleShiftSchema } from "@/lib/shiftValidation";
import { checkShiftConflicts } from "@/lib/shiftWrites";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAdmin();
    const data = singleShiftSchema.parse(await req.json());
    return prisma.$transaction(async (tx) => {
      const existing = await tx.shift.findFirst({ where: { id: params.id, employee: { restaurantId: session.activeRestaurantId } } });
      const employee = await tx.employee.findFirst({ where: { id: data.employeeId, restaurantId: session.activeRestaurantId } });
      if (!existing || !employee) return NextResponse.json({ error: "Créneau ou employé introuvable" }, { status: 404 });
      const error = await checkShiftConflicts(tx, [data], params.id);
      if (error) return NextResponse.json({ error }, { status: 409 });
      const shift = await tx.shift.update({ where: { id: params.id }, data });
      return NextResponse.json(shift);
    });
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
