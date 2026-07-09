import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import {
  RECIPE_QUANTITY_UNITS,
  TVA_A_EMPORTER,
  TVA_SUR_PLACE,
  computeCostOfGoods,
  computeMargin,
} from "@/lib/margins";

const productSchema = z.object({
  name: z.string().min(1),
  priceOnSite: z.number().nonnegative(),
  priceTakeaway: z.number().nonnegative(),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        quantity: z.number().positive(),
        quantityUnit: z.enum(RECIPE_QUANTITY_UNITS),
      })
    )
    .min(1, "Ajoutez au moins un ingrédient"),
});

function withMargins(product: {
  priceOnSite: number;
  priceTakeaway: number;
  ingredients: { quantity: number; quantityUnit: string; ingredient: { unit: string; price: number } }[];
}) {
  const cost = computeCostOfGoods(product.ingredients);
  return {
    cost,
    onSite: computeMargin(product.priceOnSite, TVA_SUR_PLACE, cost),
    takeaway: computeMargin(product.priceTakeaway, TVA_A_EMPORTER, cost),
  };
}

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: { ingredients: { include: { ingredient: true } } },
  });

  const withCalc = products.map((p) => ({ ...p, margins: withMargins(p) }));
  return NextResponse.json(withCalc);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin();
  const data = productSchema.parse(await req.json());

  const product = await prisma.product.create({
    data: {
      name: data.name,
      priceOnSite: data.priceOnSite,
      priceTakeaway: data.priceTakeaway,
      ingredients: {
        create: data.ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
          quantityUnit: i.quantityUnit,
        })),
      },
    },
    include: { ingredients: { include: { ingredient: true } } },
  });

  return NextResponse.json({ ...product, margins: withMargins(product) }, { status: 201 });
});
