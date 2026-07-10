// Calculs de coût de revient et de marge, partagés entre API et UI.

export const TVA_SUR_PLACE = 0.10;
export const TVA_A_EMPORTER = 0.055;

export const INGREDIENT_UNITS = ["kg", "L", "piece"] as const;
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

export const RECIPE_QUANTITY_UNITS = ["g", "kg", "mL", "L", "piece"] as const;
export type RecipeQuantityUnit = (typeof RECIPE_QUANTITY_UNITS)[number];

const UNIT_FAMILY: Record<RecipeQuantityUnit, IngredientUnit> = {
  g: "kg",
  kg: "kg",
  mL: "L",
  L: "L",
  piece: "piece",
};

const TO_BASE_FACTOR: Record<RecipeQuantityUnit, number> = {
  g: 1 / 1000,
  kg: 1,
  mL: 1 / 1000,
  L: 1,
  piece: 1,
};

/** Unités de saisie compatibles avec l'unité d'achat d'un ingrédient (ex: kg -> g, kg). */
export function allowedQuantityUnitsFor(ingredientUnit: IngredientUnit): RecipeQuantityUnit[] {
  return RECIPE_QUANTITY_UNITS.filter((u) => UNIT_FAMILY[u] === ingredientUnit);
}

/** Convertit une quantité de recette dans l'unité de base de l'ingrédient (kg, L ou pièce). */
export function convertToIngredientUnit(
  quantity: number,
  quantityUnit: RecipeQuantityUnit,
  ingredientUnit: IngredientUnit
): number {
  if (UNIT_FAMILY[quantityUnit] !== ingredientUnit) {
    throw new Error(
      `Unité incompatible: ${quantityUnit} ne peut pas être convertie vers ${ingredientUnit}`
    );
  }
  return quantity * TO_BASE_FACTOR[quantityUnit];
}

export const CHANNELS = ["BOTH", "SUR_PLACE", "EMPORTER"] as const;
export type Channel = (typeof CHANNELS)[number];
export type SalesChannel = "SUR_PLACE" | "EMPORTER";

export type RecipeLine = {
  quantity: number;
  quantityUnit: string;
  channel?: string;
  ingredient: { unit: string; price: number };
};

/** Coût de revient pour un mode de vente donné : les lignes "BOTH" comptent toujours, les lignes
 * spécifiques à l'autre canal sont ignorées (ex: emballage à emporter n'entre pas dans le coût sur place). */
export function computeCostOfGoods(lines: RecipeLine[], salesChannel: SalesChannel): number {
  return lines
    .filter((line) => !line.channel || line.channel === "BOTH" || line.channel === salesChannel)
    .reduce((total, line) => {
      const qtyInBaseUnit = convertToIngredientUnit(
        line.quantity,
        line.quantityUnit as RecipeQuantityUnit,
        line.ingredient.unit as IngredientUnit
      );
      return total + qtyInBaseUnit * line.ingredient.price;
    }, 0);
}

export type MarginResult = {
  priceTTC: number;
  priceHT: number;
  cost: number;
  marginEuros: number;
  marginPercent: number;
};

/** Marge nette réelle après TVA: on part du prix TTC affiché en carte, on retire la TVA puis le coût de revient. */
export function computeMargin(priceTTC: number, tvaRate: number, cost: number): MarginResult {
  const priceHT = priceTTC / (1 + tvaRate);
  const marginEuros = priceHT - cost;
  const marginPercent = priceHT > 0 ? (marginEuros / priceHT) * 100 : 0;
  return { priceTTC, priceHT, cost, marginEuros, marginPercent };
}
