import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireMargesAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { INGREDIENT_UNITS } from "@/lib/margins";

const ingredientSchema = z.object({
  name: z.string().min(1),
  unit: z.enum(INGREDIENT_UNITS),
  price: z.number().nonnegative(),
  supplier: z.string().optional().nullable(),
});

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    await requireMargesAccess();
    const data = ingredientSchema.parse(await req.json());

    const existing = await prisma.ingredient.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Ingrédient introuvable" }, { status: 404 });
    }

    const priceChanged = existing.price !== data.price;

    const ingredient = await prisma.ingredient.update({
      where: { id: params.id },
      data: {
        ...data,
        ...(priceChanged ? { priceHistory: { create: { price: data.price } } } : {}),
      },
    });

    return NextResponse.json(ingredient);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    await requireMargesAccess();
    try {
      await prisma.ingredient.delete({ where: { id: params.id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        return NextResponse.json(
          { error: "Cet ingrédient est utilisé dans une ou plusieurs recettes et ne peut pas être supprimé." },
          { status: 409 }
        );
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  }
);
