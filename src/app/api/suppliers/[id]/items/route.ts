import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const itemSchema = z.object({
  reference: z.string().optional().nullable(),
  designation: z.string().min(1),
  packaging: z.string().optional().nullable(),
  orderQuantity: z.number().nonnegative().default(0),
  unitPriceHT: z.number().nonnegative().optional().nullable(),
  casePriceHT: z.number().nonnegative().optional().nullable(),
});

export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    await requireAdmin();
    const data = itemSchema.parse(await req.json());
    const item = await prisma.supplierItem.create({ data: { ...data, supplierId: params.id } });
    return NextResponse.json(item, { status: 201 });
  }
);
