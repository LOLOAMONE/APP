import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMercurialeAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const itemSchema = z.object({
  reference: z.string().optional().nullable(),
  designation: z.string().min(1),
  packaging: z.string().optional().nullable(),
  orderQuantity: z.number().nonnegative().default(0),
  unitPriceHT: z.number().nonnegative().optional().nullable(),
  casePriceHT: z.number().nonnegative().optional().nullable(),
  orderedAt: z.string().optional().nullable(),
  receivedAt: z.string().optional().nullable(),
});

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    await requireMercurialeAccess();
    const data = itemSchema.parse(await req.json());
    const item = await prisma.supplierItem.update({
      where: { id: params.id },
      data: {
        ...data,
        orderedAt: data.orderedAt ? new Date(data.orderedAt) : null,
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : null,
      },
    });
    return NextResponse.json(item);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    await requireMercurialeAccess();
    await prisma.supplierItem.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
