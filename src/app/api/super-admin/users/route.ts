import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, hashPassword } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const membershipSchema = z.object({
  restaurantId: z.string().min(1),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
});

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  isSuperAdmin: z.boolean().default(false),
  memberships: z.array(membershipSchema).default([]),
  globalModules: z.array(z.string().min(1)).default([]),
});

// Vue réseau : chaque utilisateur avec TOUS ses rattachements (tous restaurants confondus)
// et ses modules à portée globale — distinct de /api/users qui est scopé au restaurant actif.
export const GET = withErrorHandling(async () => {
  await requireSuperAdmin();
  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
    include: {
      memberships: { include: { restaurant: { select: { id: true, name: true } } } },
      modulePermissions: { where: { restaurantId: null } },
      employee: { select: { id: true, name: true, restaurantId: true } },
    },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      username: u.username,
      isSuperAdmin: u.isSuperAdmin,
      memberships: u.memberships.map((m) => ({
        restaurantId: m.restaurantId,
        restaurantName: m.restaurant.name,
        role: m.role,
      })),
      globalModules: u.modulePermissions.map((p) => p.module),
      employee: u.employee,
    }))
  );
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireSuperAdmin();
  const data = createUserSchema.parse(await req.json());

  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) {
    return NextResponse.json({ error: "Cet identifiant est déjà utilisé" }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { username: data.username, passwordHash, isSuperAdmin: data.isSuperAdmin },
    });
    if (data.memberships.length > 0) {
      await tx.userRestaurant.createMany({
        data: data.memberships.map((m) => ({ userId: created.id, restaurantId: m.restaurantId, role: m.role })),
      });
    }
    if (data.globalModules.length > 0) {
      await tx.modulePermission.createMany({
        data: data.globalModules.map((module) => ({ userId: created.id, module, restaurantId: null })),
      });
    }
    return created;
  });

  return NextResponse.json({ id: user.id, username: user.username, isSuperAdmin: user.isSuperAdmin }, { status: 201 });
});
