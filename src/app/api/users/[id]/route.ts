import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const updateSchema = z.object({
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  canAccessMarges: z.boolean(),
  canAccessMercuriale: z.boolean(),
});

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAdmin();
    const data = updateSchema.parse(await req.json());

    if (session.sub === params.id && data.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Vous ne pouvez pas retirer votre propre rôle direction" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        role: data.role,
        canAccessMarges: data.canAccessMarges,
        canAccessMercuriale: data.canAccessMercuriale,
      },
      select: {
        id: true,
        username: true,
        role: true,
        canAccessMarges: true,
        canAccessMercuriale: true,
        employee: { select: { id: true, name: true, position: true } },
      },
    });

    return NextResponse.json(user);
  }
);
