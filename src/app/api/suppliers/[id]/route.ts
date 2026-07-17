import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMercurialeAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const supplierSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional().nullable(),
  orderSchedule: z.string().optional().nullable(),
  minimumOrder: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  clientCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireMercurialeAccess();
    const data = supplierSchema.parse(await req.json());
    const existing = await prisma.supplier.findUnique({ where: { id: params.id } });
    if (!existing || existing.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
    }
    const supplier = await prisma.supplier.update({ where: { id: params.id }, data });
    return NextResponse.json(supplier);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireMercurialeAccess();
    const existing = await prisma.supplier.findUnique({ where: { id: params.id } });
    if (!existing || existing.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
    }
    await prisma.supplier.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
