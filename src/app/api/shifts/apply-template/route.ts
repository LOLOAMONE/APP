import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addDays, parseISO } from "date-fns";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { toISODate } from "@/lib/dates";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const applySchema = z.object({
  weekStart: z.string().regex(dateRegex), // date du lundi de la semaine ciblée
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin();
  const { weekStart } = applySchema.parse(await req.json());
  const monday = parseISO(weekStart);

  const entries = await prisma.scheduleTemplateEntry.findMany();
  if (entries.length === 0) {
    return NextResponse.json({ created: 0 });
  }

  const weekEnd = toISODate(addDays(monday, 6));
  const existingShifts = await prisma.shift.findMany({
    where: { date: { gte: weekStart, lte: weekEnd } },
    select: { employeeId: true, date: true },
  });
  const existingKeys = new Set(existingShifts.map((s) => `${s.employeeId}_${s.date}`));

  const toCreate = entries
    .map((entry) => ({
      employeeId: entry.employeeId,
      date: toISODate(addDays(monday, entry.dayOfWeek)),
      startTime: entry.startTime,
      endTime: entry.endTime,
    }))
    .filter((s) => !existingKeys.has(`${s.employeeId}_${s.date}`));

  if (toCreate.length > 0) {
    await prisma.shift.createMany({ data: toCreate });
  }

  return NextResponse.json({ created: toCreate.length });
});
