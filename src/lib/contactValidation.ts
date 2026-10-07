import { z } from "zod";
import { planningDateSchema } from "./shiftValidation";
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
export const contactSchema = z.object({
  customValues: z.record(z.string().regex(/^custom_[a-zA-Z0-9_-]{1,73}$/), z.string().max(2000)).refine((values) => Object.keys(values).length <= 50).optional(),
  name: z.string().trim().min(1).max(200),
  firstName: optionalText(100), lastName: optionalText(100), companyName: optionalText(200),
  companyId: optionalText(100), role: optionalText(150), phone: optionalText(50),
  email: z.union([z.string().trim().email().max(254), z.literal(""), z.null()]).optional(),
  addressLine1: optionalText(250), addressLine2: optionalText(250), postalCode: optionalText(30), city: optionalText(120), country: optionalText(100),
  preferredChannel: z.enum(["EMAIL", "WHATSAPP", "POST"]).nullable().optional(),
  consentEmail: z.boolean().optional(), consentWhatsapp: z.boolean().optional(), consentPost: z.boolean().optional(),
  tags: optionalText(500), notes: optionalText(10000),
  lastContactDate: planningDateSchema.nullable().optional(), nextContactDate: planningDateSchema.nullable().optional(),
  birthdayDay: z.number().int().min(1).max(31).nullable().optional(), birthdayMonth: z.number().int().min(1).max(12).nullable().optional(),
}).superRefine((data, ctx) => {
  if (!!data.birthdayDay !== !!data.birthdayMonth) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Renseignez le jour et le mois de l’anniversaire." });
  if (data.birthdayDay && data.birthdayMonth && new Date(Date.UTC(2000, data.birthdayMonth - 1, data.birthdayDay)).getUTCMonth() !== data.birthdayMonth - 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Anniversaire invalide." });
});
