import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const updateSchema = z.object({
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  canAccessMarges: z.boolean(),
  canAccessMercuriale: z.boolean(),
  canAccessCrm: z.boolean(),
  canAccessMarketing: z.boolean(),
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

    const membership = await prisma.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: params.id, restaurantId: session.activeRestaurantId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const grantedModules = (
      [
        ["marges", data.canAccessMarges],
        ["mercuriale", data.canAccessMercuriale],
        ["crm", data.canAccessCrm],
        ["marketing", data.canAccessMarketing],
      ] as [string, boolean][]
    )
      .filter(([, granted]) => granted && data.role !== "ADMIN")
      .map(([module]) => module);

    const user = await prisma.$transaction(async (tx) => {
      await tx.userRestaurant.update({
        where: { userId_restaurantId: { userId: params.id, restaurantId: session.activeRestaurantId } },
        data: { role: data.role },
      });
      await tx.modulePermission.deleteMany({ where: { userId: params.id, restaurantId: session.activeRestaurantId } });
      if (grantedModules.length > 0) {
        await tx.modulePermission.createMany({
          data: grantedModules.map((module) => ({
            userId: params.id,
            module,
            restaurantId: session.activeRestaurantId,
          })),
        });
      }
      return tx.user.findUniqueOrThrow({
        where: { id: params.id },
        include: { employee: { select: { id: true, name: true, position: true } } },
      });
    });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: data.role,
      canAccessMarges: data.role === "ADMIN" || data.canAccessMarges,
      canAccessMercuriale: data.role === "ADMIN" || data.canAccessMercuriale,
      canAccessCrm: data.role === "ADMIN" || data.canAccessCrm,
      canAccessMarketing: data.role === "ADMIN" || data.canAccessMarketing,
      employee: user.employee,
    });
  }
);
