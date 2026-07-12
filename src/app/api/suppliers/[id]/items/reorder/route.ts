import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireMercurialeAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    await requireMercurialeAccess();
    const { ids } = reorderSchema.parse(await req.json());

    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.supplierItem.updateMany({ where: { id, supplierId: params.id }, data: { order: index } })
      )
    );

    return NextResponse.json({ ok: true });
  }
);
