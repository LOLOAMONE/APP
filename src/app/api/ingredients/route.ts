import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMargesAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const ingredientSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  price: z.number().nonnegative(),
  supplier: z.string().optional().nullable(),
});

export const GET = withErrorHandling(async () => {
  await requireMargesAccess();
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { order: "asc" },
  });
  return NextResponse.json(ingredients);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireMargesAccess();
  const data = ingredientSchema.parse(await req.json());

  const last = await prisma.ingredient.findFirst({ orderBy: { order: "desc" } });
  const ingredient = await prisma.ingredient.create({
    data: {
      ...data,
      order: (last?.order ?? -1) + 1,
      priceHistory: { create: { price: data.price } },
    },
  });

  return NextResponse.json(ingredient, { status: 201 });
});
