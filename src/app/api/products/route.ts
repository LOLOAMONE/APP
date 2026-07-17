import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMargesAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import {
  CHANNELS,
  TVA_A_EMPORTER,
  TVA_SUR_PLACE,
  computeCostOfGoods,
  computeMargin,
} from "@/lib/margins";

const productSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).default("Autre"),
  priceOnSite: z.number().nonnegative(),
  priceTakeaway: z.number().nonnegative(),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        quantity: z.number().positive(),
        quantityUnit: z.string().min(1),
        channel: z.enum(CHANNELS).default("BOTH"),
      })
    )
    .min(1, "Ajoutez au moins un ingrédient"),
});

function withMargins(product: {
  priceOnSite: number;
  priceTakeaway: number;
  ingredients: {
    quantity: number;
    quantityUnit: string;
    channel: string;
    ingredient: { unit: string; price: number };
  }[];
}) {
  const costOnSite = computeCostOfGoods(product.ingredients, "SUR_PLACE");
  const costTakeaway = computeCostOfGoods(product.ingredients, "EMPORTER");
  return {
    onSite: computeMargin(product.priceOnSite, TVA_SUR_PLACE, costOnSite),
    takeaway: computeMargin(product.priceTakeaway, TVA_A_EMPORTER, costTakeaway),
  };
}

export const GET = withErrorHandling(async () => {
  const session = await requireMargesAccess();
  const products = await prisma.product.findMany({
    where: { restaurantId: session.activeRestaurantId },
    orderBy: { order: "asc" },
    include: { ingredients: { include: { ingredient: true } } },
  });

  const withCalc = products.map((p) => ({ ...p, margins: withMargins(p) }));
  return NextResponse.json(withCalc);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireMargesAccess();
  const data = productSchema.parse(await req.json());

  const last = await prisma.product.findFirst({
    where: { restaurantId: session.activeRestaurantId },
    orderBy: { order: "desc" },
  });
  const product = await prisma.product.create({
    data: {
      name: data.name,
      category: data.category,
      priceOnSite: data.priceOnSite,
      priceTakeaway: data.priceTakeaway,
      restaurantId: session.activeRestaurantId,
      order: (last?.order ?? -1) + 1,
      ingredients: {
        create: data.ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
          quantityUnit: i.quantityUnit,
          channel: i.channel,
        })),
      },
    },
    include: { ingredients: { include: { ingredient: true } } },
  });

  return NextResponse.json({ ...product, margins: withMargins(product) }, { status: 201 });
});
