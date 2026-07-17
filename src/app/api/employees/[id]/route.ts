import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const updateEmployeeSchema = z.object({
  name: z.string().min(1),
  position: z.string().min(1),
  hourlyRate: z.number().nonnegative().nullable().optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
});

export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAdmin();
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, position: true, hourlyRate: true, userId: true, restaurantId: true },
    });
    if (!employee || employee.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }
    const { restaurantId: _restaurantId, ...rest } = employee;
    return NextResponse.json(rest);
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

    if (employee.userId && (data.username || data.password)) {
      if (data.username) {
        const conflict = await prisma.user.findFirst({
          where: { username: data.username, NOT: { id: employee.userId } },
        });
        if (conflict) {
          return NextResponse.json({ error: "Cet identifiant est déjà utilisé" }, { status: 409 });
        }
      }
      await prisma.user.update({
        where: { id: employee.userId },
        data: {
          ...(data.username ? { username: data.username } : {}),
          ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}),
        },
      });
    }

    const updated = await prisma.employee.update({
      where: { id: params.id },
      data: {
        name: data.name,
        position: data.position,
        hourlyRate: data.hourlyRate ?? null,
      },
      select: { id: true, name: true, position: true, hourlyRate: true, userId: true },
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
