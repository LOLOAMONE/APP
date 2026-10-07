import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCrmAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { clientFieldsSchema, readClientFields } from "@/lib/clientFields";
export const GET = withErrorHandling(async () => {
  const session = await requireCrmAccess();
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: session.activeRestaurantId }, select: { clientFieldConfig: true } });
  return NextResponse.json(readClientFields(restaurant.clientFieldConfig));
});
export const PUT = withErrorHandling(async (req: NextRequest) => {
  const session = await requireCrmAccess();
  const fields = clientFieldsSchema.parse(await req.json());
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: session.activeRestaurantId }, select: { clientFieldConfig: true } });
  const previous = readClientFields(restaurant.clientFieldConfig);
  if (previous.filter((f) => f.custom).some((f) => !fields.some((next) => next.id === f.id && next.type === f.type && next.custom))) return NextResponse.json({ error: "Masquez les anciens champs pour conserver leurs valeurs ; leur type ne peut pas être changé." }, { status: 400 });
  await prisma.restaurant.update({ where: { id: session.activeRestaurantId }, data: { clientFieldConfig: JSON.stringify(fields) } });
  return NextResponse.json(readClientFields(JSON.stringify(fields)));
});
