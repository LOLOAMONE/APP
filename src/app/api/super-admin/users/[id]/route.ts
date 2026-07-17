import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const membershipSchema = z.object({
  restaurantId: z.string().min(1),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
});

const updateUserSchema = z.object({
  isSuperAdmin: z.boolean(),
  memberships: z.array(membershipSchema),
  globalModules: z.array(z.string().min(1)),
});

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireSuperAdmin();
    const data = updateUserSchema.parse(await req.json());

    if (session.sub === params.id && !data.isSuperAdmin) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas retirer votre propre statut super admin" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: params.id }, data: { isSuperAdmin: data.isSuperAdmin } });

      await tx.userRestaurant.deleteMany({ where: { userId: params.id } });
      if (data.memberships.length > 0) {
        await tx.userRestaurant.createMany({
          data: data.memberships.map((m) => ({ userId: params.id, restaurantId: m.restaurantId, role: m.role })),
        });
      }

      await tx.modulePermission.deleteMany({ where: { userId: params.id, restaurantId: null } });
      if (data.globalModules.length > 0) {
        await tx.modulePermission.createMany({
          data: data.globalModules.map((module) => ({ userId: params.id, module, restaurantId: null })),
        });
      }
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        memberships: { include: { restaurant: { select: { id: true, name: true } } } },
        modulePermissions: { where: { restaurantId: null } },
        employee: { select: { id: true, name: true, restaurantId: true } },
      },
    });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      isSuperAdmin: user.isSuperAdmin,
      memberships: user.memberships.map((m) => ({
        restaurantId: m.restaurantId,
        restaurantName: m.restaurant.name,
        role: m.role,
      })),
      globalModules: user.modulePermissions.map((p) => p.module),
      employee: user.employee,
    });
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireSuperAdmin();
    if (session.sub === params.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  }
);
