import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
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

const accountSchema = z.object({
  username: z.string().trim().min(3).max(80),
  password: z.string().min(6).max(128).optional(),
  name: z.string().trim().min(1).max(120).optional(),
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await requireAdmin();
  const data = accountSchema.parse(await req.json());
  const target = await prisma.user.findFirst({ where: { id: params.id, memberships: { some: { restaurantId: session.activeRestaurantId } } }, include: { employee: true, memberships: true } });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  if (!session.isSuperAdmin && (target.isSuperAdmin || target.memberships.some((m) => m.restaurantId !== session.activeRestaurantId))) return NextResponse.json({ error: "Ce compte partagé doit être modifié par un administrateur global." }, { status: 403 });
  if (params.id === session.sub && (data.password || data.username !== target.username)) return NextResponse.json({ error: "Utilisez Mon profil pour modifier votre propre accès." }, { status: 400 });
  if (data.name && (!target.employee || target.employee.restaurantId !== session.activeRestaurantId)) return NextResponse.json({ error: "Ce compte n’a pas de fiche employé dans ce restaurant." }, { status: 400 });
  const conflict = await prisma.user.findFirst({ where: { username: data.username, id: { not: params.id } } });
  if (conflict) return NextResponse.json({ error: "Cet identifiant est déjà utilisé" }, { status: 409 });
  const passwordHash = data.password ? await hashPassword(data.password) : undefined;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: params.id }, data: { username: data.username, ...(passwordHash ? { passwordHash } : {}) } });
    if (data.name && target.employee) await tx.employee.update({ where: { id: target.employee.id }, data: { name: data.name } });
  });
  return NextResponse.json({ ok: true });
});
