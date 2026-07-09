import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser, hashPassword } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const createEmployeeSchema = z.object({
  name: z.string().min(1),
  position: z.string().min(1),
  hourlyRate: z.number().nonnegative().nullable().optional(),
  username: z.string().min(3),
  password: z.string().min(6),
});

export const GET = withErrorHandling(async () => {
  // Accessible à tous les comptes connectés : l'employé doit voir toute l'équipe dans le planning.
  await requireUser();
  const employees = await prisma.employee.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, position: true, hourlyRate: true, userId: true },
  });
  return NextResponse.json(employees);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin();
  const data = createEmployeeSchema.parse(await req.json());

  const existingUser = await prisma.user.findUnique({ where: { username: data.username } });
  if (existingUser) {
    return NextResponse.json({ error: "Cet identifiant est déjà utilisé" }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);

  const employee = await prisma.employee.create({
    data: {
      name: data.name,
      position: data.position,
      hourlyRate: data.hourlyRate ?? null,
      user: {
        create: { username: data.username, passwordHash, role: "EMPLOYEE" },
      },
    },
    select: { id: true, name: true, position: true, hourlyRate: true, userId: true },
  });

  return NextResponse.json(employee, { status: 201 });
});
