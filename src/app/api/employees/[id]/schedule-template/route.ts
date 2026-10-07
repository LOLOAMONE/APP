import { NextRequest, NextResponse } from "next/server";
import { weeklyTemplateSchema } from "@/lib/shiftValidation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const session = await requireAdmin();
    const employee = await prisma.employee.findUnique({ where: { id: params.id } });
    if (!employee || employee.restaurantId !== session.activeRestaurantId) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }
    const entries = await prisma.scheduleTemplateEntry.findMany({
      where: { employeeId: params.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
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
    const data = weeklyTemplateSchema.parse(await req.json());

    await prisma.$transaction([
      prisma.employee.update({ where: { id: params.id }, data: { restDays: JSON.stringify(data.restDays) } }),
      prisma.scheduleTemplateEntry.deleteMany({ where: { employeeId: params.id } }),
      prisma.scheduleTemplateEntry.createMany({
        data: data.entries.map((e) => ({ ...e, employeeId: params.id })),
      }),
    ]);

    const entries = await prisma.scheduleTemplateEntry.findMany({
      where: { employeeId: params.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(entries);
  }
);
