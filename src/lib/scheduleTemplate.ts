export const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export type TemplateDay = { enabled: boolean; startTime: string; endTime: string };

export function emptyTemplate(): TemplateDay[] {
  return DAY_LABELS.map(() => ({ enabled: false, startTime: "09:00", endTime: "17:00" }));
}
