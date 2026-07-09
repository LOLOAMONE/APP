import { addDays, format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatDayLabel(date: Date): string {
  return format(date, "EEEE d MMM", { locale: fr });
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  return `${format(weekStart, "d MMM", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`;
}

/** Durée en heures décimales entre deux horaires "HH:mm" du même jour. */
export function hoursBetween(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}
