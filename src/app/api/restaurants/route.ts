import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const restaurantSchema = z.object({
  name: z.string().min(1),
});

// Liste de base proposée à chaque nouveau restaurant, modifiable librement ensuite
// sans impact sur les autres restaurants (voir Réglages > Unités / Mercuriale > Unités).
const DEFAULT_MEASURE_UNITS = ["Carton de 6", "Carton de 12", "Lot de 6"];
const DEFAULT_PACKAGING_UNITS = ["Carton de 6", "Carton de 12", "Lot de 6", "Palette"];

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const GET = withErrorHandling(async () => {
  await requireSuperAdmin();
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { memberships: true, employees: true } } },
  });
  return NextResponse.json(
    restaurants.map(({ _count, ...r }) => ({ ...r, userCount: _count.memberships, employeeCount: _count.employees }))
  );
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireSuperAdmin();
  const data = restaurantSchema.parse(await req.json());

  const baseSlug = slugify(data.name) || "restaurant";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.restaurant.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const restaurant = await prisma.$transaction(async (tx) => {
    const created = await tx.restaurant.create({ data: { name: data.name, slug } });
    await tx.measureUnit.createMany({
      data: DEFAULT_MEASURE_UNITS.map((label) => ({ label, restaurantId: created.id })),
    });
    await tx.packagingUnit.createMany({
      data: DEFAULT_PACKAGING_UNITS.map((label) => ({ label, restaurantId: created.id })),
    });
    return created;
  });

  return NextResponse.json(restaurant, { status: 201 });
});
