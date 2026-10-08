import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { planningDateSchema } from "@/lib/shiftValidation";
import { prisma } from "@/lib/db";
import { requirePlanningSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";



const absenceSchema = z.object({
  employeeId: z.string().min(1),
  startDate: planningDateSchema,
  endDate: planningDateSchema,
  type: z.enum(["CONGE_PAYE", "MALADIE", "REPOS", "AUTRE"]),
  note: z.string().optional().nullable(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const user = await requirePlanningSession();
  const isLocalAdmin = user.isSuperAdmin || user.activeRole === "ADMIN";
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const upcoming = searchParams.get("upcoming");

  if (upcoming === "true") {
    const todayISO = new Date().toISOString().slice(0, 10);
    const absences = await prisma.absence.findMany({
      where: {
        endDate: { gte: todayISO },
        employee: { restaurantId: user.activeRestaurantId },
        ...(isLocalAdmin ? {} : { employeeId: user.employeeId ?? "__none__" }),
      },
      orderBy: { startDate: "asc" },
    });
    return NextResponse.json(absences);
  }

  if (start && end) {
    // Le calendrier salarié ne contient que ses propres absences validées.
    const absences = await prisma.absence.findMany({
      where: {
        status: "APPROVED",
        ...(isLocalAdmin ? {} : { employeeId: user.employeeId ?? "__none__" }),
        startDate: { lte: end },
        endDate: { gte: start },
        employee: { restaurantId: user.activeRestaurantId },
      },
      orderBy: { startDate: "asc" },
    });
    return NextResponse.json(absences);
  }

  if (!isLocalAdmin) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }
  const absences = await prisma.absence.findMany({
    where: { employee: { restaurantId: user.activeRestaurantId } },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json(absences);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requirePlanningSession();
  const isLocalAdmin = user.isSuperAdmin || user.activeRole === "ADMIN";
  const data = absenceSchema.parse(await req.json());

  if (data.endDate < data.startDate) {
    return NextResponse.json(
      { error: "La date de fin doit être après la date de début" },
      { status: 400 }
    );
  }

  if (!isLocalAdmin && data.employeeId !== user.employeeId) {
    return NextResponse.json(
      { error: "Vous ne pouvez déclarer une absence que pour vous-même" },
      { status: 403 }
    );
  }

  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
  if (!employee || employee.restaurantId !== user.activeRestaurantId) {
    return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
  }

  const absence = await prisma.absence.create({
    data: { ...data, status: isLocalAdmin ? "APPROVED" : "PENDING" },
  });

  return NextResponse.json(absence, { status: 201 });
});
