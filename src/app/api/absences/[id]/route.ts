import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const updateSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    await requireAdmin();
    const data = updateSchema.parse(await req.json());
    const absence = await prisma.absence.update({ where: { id: params.id }, data });
    return NextResponse.json(absence);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    await requireAdmin();
    await prisma.absence.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
