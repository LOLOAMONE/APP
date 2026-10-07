import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addDays, parseISO } from "date-fns";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { toISODate } from "@/lib/dates";
import { planningDateSchema } from "@/lib/shiftValidation";

const applySchema = z.object({ weekStart: planningDateSchema.refine((date) => parseISO(date).getDay() === 1, "La semaine doit commencer un lundi") });

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireAdmin();
  const { weekStart } = applySchema.parse(await req.json());
  const monday = parseISO(weekStart);
  const weekEnd = toISODate(addDays(monday, 6));
  return prisma.$transaction(async (tx) => {
    const scope = { employee: { restaurantId: session.activeRestaurantId } };
    const people = await tx.employee.findMany({ where: { restaurantId: session.activeRestaurantId }, select: { id: true, restDays: true } });
    const rests = new Map(people.map((p) => [p.id, JSON.parse(p.restDays) as number[]]));
    const entries = await tx.scheduleTemplateEntry.findMany({ where: scope });
    const existingShifts = await tx.shift.findMany({ where: { ...scope, date: { gte: weekStart, lte: weekEnd } }, select: { employeeId: true, date: true } });
    const absences = await tx.absence.findMany({ where: { ...scope, status: "APPROVED", startDate: { lte: weekEnd }, endDate: { gte: weekStart } } });
    const existingKeys = new Set(existingShifts.map((s) => `${s.employeeId}_${s.date}`));
    let skippedAbsences = 0;
    const toCreate = entries.filter((entry) => !rests.get(entry.employeeId)?.includes(entry.dayOfWeek)).map((entry) => ({ employeeId: entry.employeeId, date: toISODate(addDays(monday, entry.dayOfWeek)), startTime: entry.startTime, endTime: entry.endTime })).filter((shift) => {
      if (absences.some((a) => a.employeeId === shift.employeeId && a.startDate <= shift.date && a.endDate >= shift.date)) { skippedAbsences++; return false; }
      return !existingKeys.has(`${shift.employeeId}_${shift.date}`);
    });
    if (toCreate.length) await tx.shift.createMany({ data: toCreate });
    return NextResponse.json({ created: toCreate.length, skippedAbsences });
  });
});
