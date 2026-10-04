import { z } from "zod";

export const planningDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => {
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}, "Date invalide");

export const shiftSlotSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
}).refine((slot) => slot.endTime > slot.startTime, "L’heure de fin doit être après l’heure de début");

export const singleShiftSchema = z.object({
  employeeId: z.string().min(1),
  date: planningDateSchema,
  startTime: z.string(),
  endTime: z.string(),
}).superRefine((data, ctx) => {
  const result = shiftSlotSchema.safeParse(data);
  if (!result.success) for (const issue of result.error.issues) ctx.addIssue(issue);
});

export const batchShiftSchema = z.object({
  employeeId: z.string().min(1),
  dates: z.array(planningDateSchema).min(1).max(7).transform((dates) => [...new Set(dates)].sort()),
  slots: z.array(shiftSlotSchema).min(1).max(3),
}).refine(({ slots }) => !slots.some((slot, i) => slots.slice(i + 1).some((other) => slotsOverlap(slot, other))),
  "Les services se chevauchent");

export function slotsOverlap(a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }) {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export const weeklyTemplateSchema = z.object({
  entries: z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: z.string(), endTime: z.string() })).max(21),
}).superRefine(({ entries }, ctx) => {
  for (const entry of entries) {
    const result = shiftSlotSchema.safeParse(entry);
    if (!result.success) for (const issue of result.error.issues) ctx.addIssue(issue);
  }
  for (let day = 0; day < 7; day++) {
    const slots = entries.filter((entry) => entry.dayOfWeek === day);
    if (slots.length > 3 || slots.some((slot, index) => slots.slice(index + 1).some((other) => slotsOverlap(slot, other)))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maximum trois services par jour, sans chevauchement." });
    }
  }
});
