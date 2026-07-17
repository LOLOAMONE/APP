import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const updateSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAdmin();
    const data = updateSchema.parse(await req.json());
    const existing = await prisma.absence.findUnique({ where: { id: params.id }, include: { employee: true } });
    if (!existing || existing.employee.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Absence introuvable" }, { status: 404 });
    }
    const absence = await prisma.absence.update({ where: { id: params.id }, data });
    return NextResponse.json(absence);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAdmin();
    const existing = await prisma.absence.findUnique({ where: { id: params.id }, include: { employee: true } });
    if (!existing || existing.employee.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Absence introuvable" }, { status: 404 });
    }
    await prisma.absence.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
