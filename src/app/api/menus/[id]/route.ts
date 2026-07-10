import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMargesAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

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

const menuInclude = {
  items: { include: { product: { include: { ingredients: { include: { ingredient: true } } } } } },
} as const;

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    await requireMargesAccess();
    const data = menuSchema.parse(await req.json());

    const menu = await prisma.$transaction(async (tx) => {
      await tx.menuItem.deleteMany({ where: { menuId: params.id } });
      return tx.menu.update({
        where: { id: params.id },
        data: {
          name: data.name,
          priceOnSite: data.priceOnSite,
          priceTakeaway: data.priceTakeaway,
          items: { create: data.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) },
        },
        include: menuInclude,
      });
    });

    return NextResponse.json(menu);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    await requireMargesAccess();
    await prisma.menu.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
