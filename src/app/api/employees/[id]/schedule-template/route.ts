import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

const timeRegex = /^\d{2}:\d{2}$/;

const templateSchema = z.object({
  entries: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(timeRegex),
        endTime: z.string().regex(timeRegex),
      })
    )
    .max(7),
});

export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAdmin();
    const employee = await prisma.employee.findUnique({ where: { id: params.id } });
    if (!employee || employee.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }
    const entries = await prisma.scheduleTemplateEntry.findMany({
      where: { employeeId: params.id },
      orderBy: { dayOfWeek: "asc" },
    });
    return NextResponse.json(entries);
  }
);

export const PUT = withErrorHandling(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAdmin();
    const employee = await prisma.employee.findUnique({ where: { id: params.id } });
    if (!employee || employee.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }
    const data = templateSchema.parse(await req.json());

    for (const entry of data.entries) {
      if (entry.endTime <= entry.startTime) {
        return NextResponse.json(
          { error: "L'heure de fin doit être après l'heure de début" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction([
      prisma.scheduleTemplateEntry.deleteMany({ where: { employeeId: params.id } }),
      prisma.scheduleTemplateEntry.createMany({
        data: data.entries.map((e) => ({ ...e, employeeId: params.id })),
      }),
    ]);

    const entries = await prisma.scheduleTemplateEntry.findMany({
      where: { employeeId: params.id },
      orderBy: { dayOfWeek: "asc" },
    });
    return NextResponse.json(entries);
  }
);
