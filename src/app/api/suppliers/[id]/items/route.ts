import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMercurialeAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const itemSchema = z.object({
  reference: z.string().optional().nullable(),
  designation: z.string().min(1),
  category: z.string().optional().nullable(),
  packaging: z.string().optional().nullable(),
  orderQuantity: z.number().nonnegative().default(0),
  unitPriceHT: z.number().nonnegative().optional().nullable(),
  casePriceHT: z.number().nonnegative().optional().nullable(),
});

export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireMercurialeAccess();
    const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
    if (!supplier || supplier.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
    }
    const data = itemSchema.parse(await req.json());
    const last = await prisma.supplierItem.findFirst({
      where: { supplierId: params.id },
      orderBy: { order: "desc" },
    });
    const item = await prisma.supplierItem.create({
      data: { ...data, supplierId: params.id, order: (last?.order ?? -1) + 1 },
    });
    return NextResponse.json(item, { status: 201 });
  }
);
