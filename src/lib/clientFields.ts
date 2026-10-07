import { z } from "zod";
export const BUILTIN_FIELDS = [
  { id: "company", label: "Entreprise" }, { id: "role", label: "Fonction" },
  { id: "email", label: "Email" }, { id: "phone", label: "Téléphone / WhatsApp" },
  { id: "address", label: "Adresse postale" }, { id: "preferredChannel", label: "Canal préféré" },
  { id: "tags", label: "Étiquettes" }, { id: "lastContactDate", label: "Dernier contact" },
  { id: "nextContactDate", label: "Prochaine relance" }, { id: "birthday", label: "Anniversaire" },
  { id: "consents", label: "Accords de communication" }, { id: "notes", label: "Notes" },
] as const;
export type ClientField = { id: string; label: string; type: "TEXT" | "DATE" | "NUMBER" | "CHECKBOX"; enabled: boolean; custom: boolean };
export const clientFieldsSchema = z.array(z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), label: z.string().trim().min(1).max(80),
  type: z.enum(["TEXT", "DATE", "NUMBER", "CHECKBOX"]), enabled: z.boolean(), custom: z.boolean(),
})).max(50).superRefine((fields, ctx) => {
  if (new Set(fields.map((f) => f.id)).size !== fields.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Champs en double" });
  if (fields.some((f) => f.custom ? !f.id.startsWith("custom_") : !BUILTIN_FIELDS.some((b) => b.id === f.id))) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Champ invalide" });
});
export function readClientFields(raw: string): ClientField[] {
  const saved: ClientField[] = JSON.parse(raw);
  return [...BUILTIN_FIELDS.map((b) => ({ id: b.id, label: b.label, type: "TEXT" as const, enabled: saved.find((f) => f.id === b.id)?.enabled ?? true, custom: false })), ...saved.filter((f) => f.custom)];
}
