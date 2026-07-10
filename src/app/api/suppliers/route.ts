import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const supplierSchema = z.object({
  name: z.string().min(1),
  contactInfo: z.string().optional().nullable(),
  orderInfo: z.string().optional().nullable(),
});

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { items: { orderBy: { designation: "asc" } } },
  });
  return NextResponse.json(suppliers);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin();
  const data = supplierSchema.parse(await req.json());
  const supplier = await prisma.supplier.create({ data, include: { items: true } });
  return NextResponse.json(supplier, { status: 201 });
});
