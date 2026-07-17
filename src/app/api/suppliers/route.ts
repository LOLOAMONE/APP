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

export const GET = withErrorHandling(async () => {
  const session = await requireMercurialeAccess();
  const suppliers = await prisma.supplier.findMany({
    where: { restaurantId: session.activeRestaurantId },
    orderBy: { order: "asc" },
    include: { items: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(suppliers);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireMercurialeAccess();
  const data = supplierSchema.parse(await req.json());
  const last = await prisma.supplier.findFirst({
    where: { restaurantId: session.activeRestaurantId },
    orderBy: { order: "desc" },
  });
  const supplier = await prisma.supplier.create({
    data: { ...data, restaurantId: session.activeRestaurantId, order: (last?.order ?? -1) + 1 },
    include: { items: true },
  });
  return NextResponse.json(supplier, { status: 201 });
});
