import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { INGREDIENT_UNITS } from "@/lib/margins";

const ingredientSchema = z.object({
  name: z.string().min(1),
  unit: z.enum(INGREDIENT_UNITS),
  price: z.number().nonnegative(),
  supplier: z.string().optional().nullable(),
});

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(ingredients);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin();
  const data = ingredientSchema.parse(await req.json());

  const ingredient = await prisma.ingredient.create({
    data: {
      ...data,
      priceHistory: { create: { price: data.price } },
    },
  });

  return NextResponse.json(ingredient, { status: 201 });
});
