import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveRestaurant } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

function todayDateString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export const GET = withErrorHandling(async () => {
  const session = await requireActiveRestaurant();
  const restaurantId = session.activeRestaurantId;
  const today = todayDateString();

  const [shifts, absencesPending, tasksOpen, itemsToOrder, marketingUpcoming] = await Promise.all([
    prisma.shift.findMany({
      where: { date: today, employee: { restaurantId } },
      orderBy: { startTime: "asc" },
      include: { employee: { select: { name: true } } },
    }),
    prisma.absence.count({ where: { status: "PENDING", employee: { restaurantId } } }),
    prisma.workspaceItem.count({ where: { restaurantId, area: "NOTES", kind: "TASK", completed: false, archived: false } }),
    prisma.supplierItem.count({ where: { supplier: { restaurantId }, orderedAt: null, orderQuantity: { gt: 0 } } }),
    prisma.workspaceItem.count({ where: { restaurantId, area: "MARKETING", archived: false, completed: false, scheduledDate: { not: null } } }),
  ]);

  return NextResponse.json({
    today: {
      date: today,
      shifts: shifts.map((s) => ({ employeeName: s.employee.name, startTime: s.startTime, endTime: s.endTime })),
      absencesPending,
    },
    keyNumbers: { tasksOpen, itemsToOrder, marketingUpcoming },
  });
});
