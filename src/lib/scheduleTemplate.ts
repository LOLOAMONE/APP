export const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export type TemplateSlot = { startTime: string; endTime: string };
export type TemplateDay = { enabled: boolean; slots: TemplateSlot[] };
export function emptyTemplate(): TemplateDay[] {
  return DAY_LABELS.map(() => ({ enabled: false, slots: [{ startTime: "09:00", endTime: "17:00" }] }));
}
