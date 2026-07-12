import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMercurialeAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const unitSchema = z.object({
  label: z.string().min(1),
});

export const GET = withErrorHandling(async () => {
  await requireMercurialeAccess();
  const units = await prisma.packagingUnit.findMany({ orderBy: { label: "asc" } });
  return NextResponse.json(units);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireMercurialeAccess();
  const data = unitSchema.parse(await req.json());

  const existing = await prisma.packagingUnit.findUnique({ where: { label: data.label } });
  if (existing) {
    return NextResponse.json(existing, { status: 200 });
  }

  const unit = await prisma.packagingUnit.create({ data });
  return NextResponse.json(unit, { status: 201 });
});
