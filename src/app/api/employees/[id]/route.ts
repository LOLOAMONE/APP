import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const updateEmployeeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  position: z.string().trim().min(1).max(120),
  weeklyHours: z.number().finite().min(0).max(168).nullable().optional(),
  hourlyRate: z.number().nonnegative().nullable().optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
});

export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAdmin();
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, position: true, hourlyRate: true, userId: true, restDays: true, weeklyHours: true, user: { select: { username: true } }, restaurantId: true },
    });
    if (!employee || employee.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }
    const { restaurantId: _restaurantId, ...rest } = employee;
    return NextResponse.json({ ...rest, restDays: JSON.parse(employee.restDays), username: employee.user?.username ?? null });
  }
);

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAdmin();
    const data = updateEmployeeSchema.parse(await req.json());

    const employee = await prisma.employee.findUnique({ where: { id: params.id } });
    if (!employee || employee.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }

    const account = employee.userId ? await prisma.user.findUnique({ where: { id: employee.userId }, include: { memberships: true } }) : null;
    if ((data.username || data.password) && !account) return NextResponse.json({ error: "Cet employé n’a pas de compte lié." }, { status: 400 });
    const changesAccess = account && (data.password || (data.username && data.username !== account.username));
    if (changesAccess && !session.isSuperAdmin && (account.isSuperAdmin || account.memberships.some((m) => m.restaurantId !== session.activeRestaurantId))) return NextResponse.json({ error: "Ce compte partagé doit être modifié par un administrateur global." }, { status: 403 });
    if (changesAccess && account.id === session.sub) return NextResponse.json({ error: "Utilisez Mon profil pour modifier votre propre accès." }, { status: 400 });
    if (data.username && account) {
      const conflict = await prisma.user.findFirst({ where: { username: data.username, id: { not: account.id } } });
      if (conflict) return NextResponse.json({ error: "Cet identifiant est déjà utilisé" }, { status: 409 });
    }
    const passwordHash = data.password ? await hashPassword(data.password) : undefined;
    const updated = await prisma.$transaction(async (tx) => {
      if (account && changesAccess) await tx.user.update({ where: { id: account.id }, data: { ...(data.username ? { username: data.username } : {}), ...(passwordHash ? { passwordHash } : {}) } });
      return tx.employee.update({ where: { id: params.id }, data: { name: data.name, position: data.position, hourlyRate: data.hourlyRate ?? null, ...(data.weeklyHours !== undefined ? { weeklyHours: data.weeklyHours } : {}) }, select: { id: true, name: true, position: true, hourlyRate: true, userId: true } });
    });

    return NextResponse.json(updated);
  }
);

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAdmin();

    const employee = await prisma.employee.findUnique({ where: { id: params.id } });
    if (!employee || employee.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }

    await prisma.employee.delete({ where: { id: params.id } });
    if (employee.userId) {
      await prisma.user.delete({ where: { id: employee.userId } });
    }

    return NextResponse.json({ ok: true });
  }
);
