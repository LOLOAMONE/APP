import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMargesAccess } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    await requireMargesAccess();
    await prisma.measureUnit.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
