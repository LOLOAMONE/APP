import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireActiveRestaurant } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export const GET = withErrorHandling(async () => {
  const session = await requireActiveRestaurant();
  const restaurantId = session.activeRestaurantId;
  const today = todayDateString();

  const [shifts, absencesPending, ticketsOpen, itemsToOrder, postsPendingValidation] = await Promise.all([
    prisma.shift.findMany({
      where: { date: today, employee: { restaurantId } },
      orderBy: { startTime: "asc" },
      include: { employee: { select: { name: true } } },
    }),
    prisma.absence.count({ where: { status: "PENDING", employee: { restaurantId } } }),
    prisma.ticket.count({ where: { restaurantId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.supplierItem.count({ where: { supplier: { restaurantId }, orderedAt: null, orderQuantity: { gt: 0 } } }),
    prisma.editorialPost.count({ where: { restaurantId, status: "PENDING_VALIDATION" } }),
  ]);

  return NextResponse.json({
    today: {
      date: today,
      shifts: shifts.map((s) => ({ employeeName: s.employee.name, startTime: s.startTime, endTime: s.endTime })),
      absencesPending,
    },
    keyNumbers: { ticketsOpen, itemsToOrder, postsPendingValidation },
  });
});
