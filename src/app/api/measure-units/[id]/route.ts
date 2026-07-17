import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMargesAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const unitSchema = z.object({
  label: z.string().min(1),
});

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireMargesAccess();
    const data = unitSchema.parse(await req.json());
    const existing = await prisma.measureUnit.findUnique({ where: { id: params.id } });
    if (!existing || existing.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Unité introuvable" }, { status: 404 });
    }
    const unit = await prisma.measureUnit.update({ where: { id: params.id }, data });
    return NextResponse.json(unit);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireMargesAccess();
    const existing = await prisma.measureUnit.findUnique({ where: { id: params.id } });
    if (!existing || existing.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Unité introuvable" }, { status: 404 });
    }
    await prisma.measureUnit.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
