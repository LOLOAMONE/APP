import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMargesAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { TVA_A_EMPORTER, TVA_SUR_PLACE, computeMargin, computeMenuCost } from "@/lib/margins";

const menuSchema = z.object({
  name: z.string().min(1),
  priceOnSite: z.number().nonnegative(),
  priceTakeaway: z.number().nonnegative(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Ajoutez au moins un produit"),
});

function withMargins(menu: {
  priceOnSite: number;
  priceTakeaway: number;
  items: {
    quantity: number;
    product: { ingredients: { quantity: number; quantityUnit: string; channel: string; ingredient: { unit: string; price: number } }[] };
  }[];
}) {
  const costOnSite = computeMenuCost(menu.items, "SUR_PLACE");
  const costTakeaway = computeMenuCost(menu.items, "EMPORTER");
  return {
    onSite: computeMargin(menu.priceOnSite, TVA_SUR_PLACE, costOnSite),
    takeaway: computeMargin(menu.priceTakeaway, TVA_A_EMPORTER, costTakeaway),
  };
}

const menuInclude = {
  items: { include: { product: { include: { ingredients: { include: { ingredient: true } } } } } },
} as const;

export const GET = withErrorHandling(async () => {
  await requireMargesAccess();
  const menus = await prisma.menu.findMany({
    orderBy: { order: "asc" },
    include: menuInclude,
  });
  return NextResponse.json(menus.map((m) => ({ ...m, margins: withMargins(m) })));
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireMargesAccess();
  const data = menuSchema.parse(await req.json());

  const last = await prisma.menu.findFirst({ orderBy: { order: "desc" } });
  const menu = await prisma.menu.create({
    data: {
      name: data.name,
      priceOnSite: data.priceOnSite,
      priceTakeaway: data.priceTakeaway,
      order: (last?.order ?? -1) + 1,
      items: { create: data.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) },
    },
    include: menuInclude,
  });

  return NextResponse.json({ ...menu, margins: withMargins(menu) }, { status: 201 });
});
