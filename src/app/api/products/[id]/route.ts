import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMargesAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { CHANNELS } from "@/lib/margins";

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

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireMargesAccess();
    const data = productSchema.parse(await req.json());

    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing || existing.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    const product = await prisma.$transaction(async (tx) => {
      await tx.productIngredient.deleteMany({ where: { productId: params.id } });
      return tx.product.update({
        where: { id: params.id },
        data: {
          name: data.name,
          category: data.category,
          priceOnSite: data.priceOnSite,
          priceTakeaway: data.priceTakeaway,
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
    });

    return NextResponse.json(product);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireMargesAccess();
    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing || existing.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }
    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
