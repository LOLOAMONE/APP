import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const supplierSchema = z.object({
  name: z.string().min(1),
  orderSchedule: z.string().optional().nullable(),
  minimumOrder: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  clientCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    await requireAdmin();
    const data = supplierSchema.parse(await req.json());
    const supplier = await prisma.supplier.update({ where: { id: params.id }, data });
    return NextResponse.json(supplier);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    await requireAdmin();
    await prisma.supplier.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
