import { z } from "zod";
import { requireActiveRestaurant, requireMarketingAccess } from "./auth";

export const workspaceSchema = z.object({
  area: z.enum(["NOTES", "MARKETING"]),
  kind: z.enum(["NOTE", "TASK", "IDEA", "POST"]),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(50000).default(""),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
    const d = new Date(`${v}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Date invalide").nullable().default(null),
  completed: z.boolean().default(false),
  pinned: z.boolean().default(false),
  archived: z.boolean().default(false),
}).refine((v) => v.area === "NOTES" ? ["NOTE", "TASK"].includes(v.kind) : ["IDEA", "TASK", "POST"].includes(v.kind), "Type incompatible avec cet espace");

export async function workspaceAccess(area: string) {
  return area === "MARKETING" ? requireMarketingAccess() : requireActiveRestaurant();
}
