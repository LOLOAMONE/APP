import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMercurialeAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const unitSchema = z.object({
  label: z.string().min(1),
});

export const GET = withErrorHandling(async () => {
  const session = await requireMercurialeAccess();
  const units = await prisma.packagingUnit.findMany({
    where: { restaurantId: session.activeRestaurantId },
    orderBy: { label: "asc" },
  });
  return NextResponse.json(units);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireMercurialeAccess();
  const data = unitSchema.parse(await req.json());

  const existing = await prisma.packagingUnit.findUnique({
    where: { restaurantId_label: { restaurantId: session.activeRestaurantId, label: data.label } },
  });
  if (existing) {
    return NextResponse.json(existing, { status: 200 });
  }

  const unit = await prisma.packagingUnit.create({ data: { ...data, restaurantId: session.activeRestaurantId } });
  return NextResponse.json(unit, { status: 201 });
});
