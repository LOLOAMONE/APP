import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireActiveRestaurant, requireAdmin, hashPassword } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const createEmployeeSchema = z.object({
  name: z.string().min(1),
  position: z.string().min(1),
  hourlyRate: z.number().nonnegative().nullable().optional(),
  username: z.string().min(3),
  password: z.string().min(6),
});

export const GET = withErrorHandling(async () => {
  // Accessible à tous les comptes connectés : l'employé doit voir toute l'équipe de son restaurant actif.
  const session = await requireActiveRestaurant();
  const employees = await prisma.employee.findMany({
    where: { restaurantId: session.activeRestaurantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      position: true,
      hourlyRate: true,
      userId: true,
      _count: { select: { scheduleTemplate: true } },
    },
  });
  return NextResponse.json(
    employees.map(({ _count, ...e }) => ({ ...e, templateDaysCount: _count.scheduleTemplate }))
  );
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireAdmin();
  const data = createEmployeeSchema.parse(await req.json());

  const existingUser = await prisma.user.findUnique({ where: { username: data.username } });
  if (existingUser) {
    return NextResponse.json({ error: "Cet identifiant est déjà utilisé" }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);

  const employee = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { username: data.username, passwordHash } });
    await tx.userRestaurant.create({
      data: { userId: user.id, restaurantId: session.activeRestaurantId, role: "EMPLOYEE" },
    });
    return tx.employee.create({
      data: {
        name: data.name,
        position: data.position,
        hourlyRate: data.hourlyRate ?? null,
        restaurantId: session.activeRestaurantId,
        userId: user.id,
      },
      select: { id: true, name: true, position: true, hourlyRate: true, userId: true },
    });
  });

  return NextResponse.json(employee, { status: 201 });
});
