import { prisma } from "./db";
import { readClientFields } from "./clientFields";
import { planningDateSchema } from "./shiftValidation";
export async function checkCustomValues(restaurantId: string, values?: Record<string, string>) {
  if (!values) return null;
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { clientFieldConfig: true } });
  const fields = readClientFields(restaurant.clientFieldConfig);
  for (const [key, value] of Object.entries(values)) {
    const field = fields.find((f) => f.id === key && f.custom);
    if (!field) return "Champ personnalisé inconnu.";
    if (!value) continue;
    if (field.type === "DATE" && !planningDateSchema.safeParse(value).success || field.type === "NUMBER" && !Number.isFinite(Number(value)) || field.type === "CHECKBOX" && value !== "true" && value !== "false") return `Valeur invalide pour ${field.label}.`;
  }
  return null;
}
