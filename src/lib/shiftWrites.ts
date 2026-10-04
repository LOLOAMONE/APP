import type { Prisma } from "@prisma/client";
import { slotsOverlap } from "./shiftValidation";

type Candidate = { employeeId: string; date: string; startTime: string; endTime: string };

// All checks run in the write transaction so a batch is either fully saved or rejected.
export async function checkShiftConflicts(tx: Prisma.TransactionClient, candidates: Candidate[], excludeId?: string) {
  const employeeId = candidates[0].employeeId;
  const dates = [...new Set(candidates.map((s) => s.date))].sort();
  const absence = await tx.absence.findFirst({
    where: { employeeId, status: "APPROVED", OR: dates.map((date) => ({ startDate: { lte: date }, endDate: { gte: date } })) },
  });
  if (absence) return "Cet employé a une absence validée sur un des jours sélectionnés.";
  const existing = await tx.shift.findMany({
    where: { employeeId, date: { in: dates }, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  const conflict = candidates.find((candidate) => existing.some((shift) => shift.date === candidate.date && slotsOverlap(candidate, shift)));
  return conflict ? `Un créneau existe déjà sur ces horaires le ${conflict.date.split("-").reverse().join("/")}. Aucun changement enregistré.` : null;
}
