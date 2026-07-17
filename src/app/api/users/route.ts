import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const MODULES = ["marges", "mercuriale", "crm"] as const;

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  canAccessMarges: z.boolean().default(false),
  canAccessMercuriale: z.boolean().default(false),
  canAccessCrm: z.boolean().default(false),
});

export const GET = withErrorHandling(async () => {
  const session = await requireAdmin();
  const memberships = await prisma.userRestaurant.findMany({
    where: { restaurantId: session.activeRestaurantId },
    include: {
      user: {
        include: {
          employee: { select: { id: true, name: true, position: true } },
          modulePermissions: { where: { restaurantId: session.activeRestaurantId } },
        },
      },
    },
    orderBy: { user: { username: "asc" } },
  });

  const users = memberships.map((m) => ({
    id: m.user.id,
    username: m.user.username,
    role: m.role as "ADMIN" | "EMPLOYEE",
    canAccessMarges: m.role === "ADMIN" || m.user.modulePermissions.some((p) => p.module === "marges"),
    canAccessMercuriale: m.role === "ADMIN" || m.user.modulePermissions.some((p) => p.module === "mercuriale"),
    canAccessCrm: m.role === "ADMIN" || m.user.modulePermissions.some((p) => p.module === "crm"),
    employee: m.user.employee,
  }));

  return NextResponse.json(users);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireAdmin();
  const data = createUserSchema.parse(await req.json());

  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) {
    return NextResponse.json({ error: "Cet identifiant est déjà utilisé" }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);

  const grantedModules = (
    [
      ["marges", data.canAccessMarges],
      ["mercuriale", data.canAccessMercuriale],
      ["crm", data.canAccessCrm],
    ] as [(typeof MODULES)[number], boolean][]
  ).filter(([, granted]) => granted && data.role !== "ADMIN");

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { username: data.username, passwordHash } });
    await tx.userRestaurant.create({
      data: { userId: created.id, restaurantId: session.activeRestaurantId, role: data.role },
    });
    if (grantedModules.length > 0) {
      await tx.modulePermission.createMany({
        data: grantedModules.map(([module]) => ({
          userId: created.id,
          module,
          restaurantId: session.activeRestaurantId,
        })),
      });
    }
    return created;
  });

  return NextResponse.json(
    {
      id: user.id,
      username: user.username,
      role: data.role,
      canAccessMarges: data.role === "ADMIN" || data.canAccessMarges,
      canAccessMercuriale: data.role === "ADMIN" || data.canAccessMercuriale,
      canAccessCrm: data.role === "ADMIN" || data.canAccessCrm,
      employee: null,
    },
    { status: 201 }
  );
});
