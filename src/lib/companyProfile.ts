import { z } from "zod";
import { planningDateSchema } from "./shiftValidation";
export const companyProfileSchema = z.object({
  type: z.enum(["Entreprise", "Club sportif amateur", "Autre"]).optional(),
  priority: z.enum(["", "A", "B", "C"]).optional(),
  status: z.enum(["À contacter", "Contacté", "À relancer", "Client", "Sans suite"]).optional(),
  potential: z.string().trim().max(1000).optional(), idea: z.string().trim().max(2000).optional(),
  followupNotes: z.string().trim().max(10000).optional(),
  lastContactDate: planningDateSchema.nullable().optional(), nextContactDate: planningDateSchema.nullable().optional(),
});
export type CompanyProfile = z.infer<typeof companyProfileSchema>;
export function readCompanyProfile(raw: string | null | undefined): CompanyProfile {
  try { return companyProfileSchema.parse(JSON.parse(raw || "{}")); } catch { return {}; }
}
export function readableContactNotes(notes: string | null | undefined) {
  const text = notes || "";
  if (!text.startsWith("Import AMONE :")) return text;
  return text.split("Coordonnées publiées pour l’activité")[0].split("\n").slice(1).join("\n").trim();
}
export function preserveImportedNotes(notes: string, original: string | null | undefined) {
  if (!original?.startsWith("Import AMONE :")) return notes;
  const marker = "Coordonnées publiées pour l’activité";
  const position = original.indexOf(marker);
  return position < 0 ? notes : original.split("\n")[0] + "\n" + notes + "\n" + original.slice(position);
}
