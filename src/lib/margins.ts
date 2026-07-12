// Calculs de coût de revient et de marge, partagés entre API et UI.

export const TVA_SUR_PLACE = 0.10;
export const TVA_A_EMPORTER = 0.055;

// Unités standards, toujours proposées. Des unités personnalisées (voir modèle MeasureUnit) peuvent
// s'y ajouter : chacune se comporte alors comme sa propre famille, sans sous-unité (comme "piece").
export const INGREDIENT_UNITS = ["kg", "L", "piece"] as const;
export type IngredientUnit = string;

export const RECIPE_QUANTITY_UNITS = ["g", "kg", "mL", "L", "piece"] as const;
export type RecipeQuantityUnit = string;

// Seules les sous-unités de saisie (g, mL) doivent être déclarées ici : toute unité absente de
// cette table (piece, ou une unité personnalisée) est considérée comme sa propre famille, facteur 1.
const SUB_UNIT_FAMILY: Record<string, string> = { g: "kg", mL: "L" };
const SUB_UNIT_FACTOR: Record<string, number> = { g: 1 / 1000, mL: 1 / 1000 };

function unitFamily(unit: string): string {
  return SUB_UNIT_FAMILY[unit] ?? unit;
}

/** Unités de saisie compatibles avec l'unité d'achat d'un ingrédient (ex: kg -> g, kg). */
export function allowedQuantityUnitsFor(ingredientUnit: IngredientUnit): RecipeQuantityUnit[] {
  if (ingredientUnit === "kg") return ["g", "kg"];
  if (ingredientUnit === "L") return ["mL", "L"];
  return [ingredientUnit];
}

/** Convertit une quantité de recette dans l'unité de base de l'ingrédient (kg, L, pièce ou unité personnalisée). */
export function convertToIngredientUnit(
  quantity: number,
  quantityUnit: RecipeQuantityUnit,
  ingredientUnit: IngredientUnit
): number {
  if (unitFamily(quantityUnit) !== ingredientUnit) {
    throw new Error(
      `Unité incompatible: ${quantityUnit} ne peut pas être convertie vers ${ingredientUnit}`
    );
  }
  return quantity * (SUB_UNIT_FACTOR[quantityUnit] ?? 1);
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

export type MenuItemLine = {
  quantity: number;
  product: { ingredients: RecipeLine[] };
};

/** Coût de revient d'un menu = somme des coûts de revient des produits qui le composent (par canal), multipliés par leur quantité. */
export function computeMenuCost(items: MenuItemLine[], salesChannel: SalesChannel): number {
  return items.reduce(
    (total, item) => total + item.quantity * computeCostOfGoods(item.product.ingredients, salesChannel),
    0
  );
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
