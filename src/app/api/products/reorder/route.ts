import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMargesAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const PUT = withErrorHandling(async (req: NextRequest) => {
  await requireMargesAccess();
  const { ids } = reorderSchema.parse(await req.json());

  await prisma.$transaction(ids.map((id, index) => prisma.product.update({ where: { id }, data: { order: index } })));

  return NextResponse.json({ ok: true });
});
