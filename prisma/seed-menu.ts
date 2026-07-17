// Import ponctuel des ingrédients et produits Amoné, à partir de "Prix achat.xlsx" (coûts)
// et "Prix menu Nice.xlsx" (prix de vente TTC). Script idempotent : peut être relancé sans dupliquer.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type IngredientUnit = "kg" | "L" | "piece";
type Channel = "BOTH" | "SUR_PLACE" | "EMPORTER";

const ingredientsData: { name: string; unit: IngredientUnit; price: number }[] = [
  { name: "Cordon bleu Gérard", unit: "piece", price: 3.2 },
  { name: "Cordon bleu Babette", unit: "piece", price: 3.7 },
  { name: "Cordon bleu Brigitte", unit: "piece", price: 3.25 },
  { name: "Cordon bleu Gilbert", unit: "piece", price: 3.8 },
  { name: "Cordon bleu Saison", unit: "piece", price: 3.8 },
  { name: "Canaillou Gérard", unit: "piece", price: 1.25 },
  { name: "Canaillou Gilbert", unit: "piece", price: 1.25 },
  { name: "Pitchounes chocolat", unit: "piece", price: 0.9521 },
  { name: "Pommes noisettes", unit: "kg", price: 2.92 },
  { name: "Oranginade", unit: "L", price: 1.5 },
  { name: "Citronnade / Limonade", unit: "L", price: 1.35 },
  { name: "Thé pêche", unit: "L", price: 1.35 },
  { name: "Eau plate Evian 50cl", unit: "piece", price: 0.452 },
  { name: "Eau Badoit 50cl", unit: "piece", price: 0.613 },
  { name: "Mayonnaise", unit: "piece", price: 0.37 },
  { name: "Ketchup", unit: "piece", price: 0.37 },
  { name: "Moutarde", unit: "piece", price: 0.37 },
  { name: "Sac SOS à emporter", unit: "piece", price: 0.0795 },
  { name: "Boîte pommes noisettes (à emporter)", unit: "piece", price: 0.09025 },
  { name: "Sachet cordon bleu à emporter", unit: "piece", price: 0.08275 },
  { name: "Sachet cordon bleu sur place", unit: "piece", price: 0.03626 },
  { name: "Sachet pitchoune (à emporter)", unit: "piece", price: 0.0299 },
  { name: "Sticker Gérard", unit: "piece", price: 0.0235 },
  { name: "Sticker Babette", unit: "piece", price: 0.0235 },
  { name: "Sticker Brigitte", unit: "piece", price: 0.0235 },
  { name: "Sticker Saison", unit: "piece", price: 0.0235 },
  { name: "Sticker Gilbert", unit: "piece", price: 0.0235 },
  { name: "Sticker Canaillou", unit: "piece", price: 0.021 },
  { name: "Sticker boisson Limonade", unit: "piece", price: 0.021 },
  { name: "Sticker boisson Citronnade", unit: "piece", price: 0.021 },
  { name: "Sticker boisson Thé pêche", unit: "piece", price: 0.021 },
  { name: "Sticker boisson Oranginade", unit: "piece", price: 0.021 },
  { name: "Sticker fermeture sac à emporter", unit: "piece", price: 0.0369 },
  { name: "Pic en bois (pommes noisettes)", unit: "piece", price: 0.0149 },
  { name: "Serviette", unit: "piece", price: 0.0298 },
  { name: "Bouteille à jus 25cl", unit: "piece", price: 0.2368 },
  { name: "Bouteille à jus 33cl", unit: "piece", price: 0.2522 },
  // Prix d'achat inconnu (absent des fichiers Excel) : placeholder à 0€, à corriger dans l'onglet Ingrédients.
  { name: "Café", unit: "piece", price: 0 },
  { name: "Double Café", unit: "piece", price: 0 },
  { name: "Café long", unit: "piece", price: 0 },
  { name: "Café au lait", unit: "piece", price: 0 },
  { name: "Café au lait Tartine", unit: "piece", price: 0 },
  { name: "Café au lait Brioche", unit: "piece", price: 0 },
  { name: "Lait Mousse", unit: "piece", price: 0 },
  { name: "Lait Ribot Chaud", unit: "piece", price: 0 },
  { name: "Cacao", unit: "piece", price: 0 },
  { name: "Thé", unit: "piece", price: 0 },
  { name: "Extra lait végétal", unit: "piece", price: 0 },
  { name: "Jus de pomme", unit: "piece", price: 0 },
  { name: "Bière blonde 33cl", unit: "piece", price: 0 },
  { name: "Bière blanche 33cl", unit: "piece", price: 0 },
  { name: "Cidre brut 33cl", unit: "piece", price: 0 },
  { name: "Vin rouge 14cl", unit: "piece", price: 0 },
  { name: "Vin blanc 14cl", unit: "piece", price: 0 },
  { name: "Vin rosé 14cl", unit: "piece", price: 0 },
  { name: "Vin rouge 75cl", unit: "piece", price: 0 },
  { name: "Vin blanc 75cl", unit: "piece", price: 0 },
];

function cordonBleuLine(matiere: string, sticker: string) {
  return [
    { ingredient: matiere, quantity: 1, quantityUnit: "piece", channel: "BOTH" as Channel },
    { ingredient: "Sachet cordon bleu sur place", quantity: 1, quantityUnit: "piece", channel: "SUR_PLACE" as Channel },
    { ingredient: "Sachet cordon bleu à emporter", quantity: 1, quantityUnit: "piece", channel: "EMPORTER" as Channel },
    { ingredient: sticker, quantity: 1, quantityUnit: "piece", channel: "BOTH" as Channel },
    { ingredient: "Serviette", quantity: 1, quantityUnit: "piece", channel: "BOTH" as Channel },
  ];
}

function boissonSoftLine(matiere: string, sticker: string) {
  return [
    { ingredient: matiere, quantity: 330, quantityUnit: "mL", channel: "BOTH" as Channel },
    { ingredient: "Bouteille à jus 33cl", quantity: 1, quantityUnit: "piece", channel: "EMPORTER" as Channel },
    { ingredient: sticker, quantity: 1, quantityUnit: "piece", channel: "EMPORTER" as Channel },
  ];
}

/** Produit simple à un seul ingrédient, sans emballage distinct (utilisé pour les boissons chaudes/alcools au coût matière encore inconnu). */
function singleLine(matiere: string) {
  return [{ ingredient: matiere, quantity: 1, quantityUnit: "piece", channel: "BOTH" as Channel }];
}

const productsData: {
  name: string;
  category: string;
  priceOnSite: number;
  priceTakeaway: number;
  ingredients: { ingredient: string; quantity: number; quantityUnit: string; channel: Channel }[];
}[] = [
  { name: "Gérard", category: "Cordon Bleu", priceOnSite: 10.9, priceTakeaway: 10.9, ingredients: cordonBleuLine("Cordon bleu Gérard", "Sticker Gérard") },
  { name: "Brigitte", category: "Cordon Bleu", priceOnSite: 10.9, priceTakeaway: 10.9, ingredients: cordonBleuLine("Cordon bleu Brigitte", "Sticker Brigitte") },
  { name: "Babette", category: "Cordon Bleu", priceOnSite: 10.9, priceTakeaway: 10.9, ingredients: cordonBleuLine("Cordon bleu Babette", "Sticker Babette") },
  { name: "Gilbert", category: "Cordon Bleu", priceOnSite: 10.9, priceTakeaway: 10.9, ingredients: cordonBleuLine("Cordon bleu Gilbert", "Sticker Gilbert") },
  { name: "Saison", category: "Cordon Bleu", priceOnSite: 10.9, priceTakeaway: 10.9, ingredients: cordonBleuLine("Cordon bleu Saison", "Sticker Saison") },
  {
    name: "Canaillou x3",
    category: "Cordon Bleu",
    priceOnSite: 9.9,
    priceTakeaway: 9.9,
    ingredients: [
      { ingredient: "Canaillou Gérard", quantity: 2, quantityUnit: "piece", channel: "BOTH" },
      { ingredient: "Canaillou Gilbert", quantity: 1, quantityUnit: "piece", channel: "BOTH" },
      { ingredient: "Sachet cordon bleu sur place", quantity: 1, quantityUnit: "piece", channel: "SUR_PLACE" },
      { ingredient: "Sachet cordon bleu à emporter", quantity: 1, quantityUnit: "piece", channel: "EMPORTER" },
      { ingredient: "Sticker Canaillou", quantity: 1, quantityUnit: "piece", channel: "BOTH" },
      { ingredient: "Serviette", quantity: 1, quantityUnit: "piece", channel: "BOTH" },
    ],
  },
  {
    name: "Pommes noisettes",
    category: "Extras",
    priceOnSite: 4,
    priceTakeaway: 4,
    ingredients: [
      { ingredient: "Pommes noisettes", quantity: 160, quantityUnit: "g", channel: "BOTH" },
      { ingredient: "Pic en bois (pommes noisettes)", quantity: 1, quantityUnit: "piece", channel: "BOTH" },
      { ingredient: "Boîte pommes noisettes (à emporter)", quantity: 1, quantityUnit: "piece", channel: "EMPORTER" },
    ],
  },
  { name: "Ketchup", category: "Sauces", priceOnSite: 0.9, priceTakeaway: 0.6, ingredients: [{ ingredient: "Ketchup", quantity: 1, quantityUnit: "piece", channel: "BOTH" }] },
  { name: "Mayonnaise", category: "Sauces", priceOnSite: 0.9, priceTakeaway: 0.6, ingredients: [{ ingredient: "Mayonnaise", quantity: 1, quantityUnit: "piece", channel: "BOTH" }] },
  { name: "Moutarde", category: "Sauces", priceOnSite: 0.9, priceTakeaway: 0.6, ingredients: [{ ingredient: "Moutarde", quantity: 1, quantityUnit: "piece", channel: "BOTH" }] },
  {
    name: "Pitchoune Chocolat",
    category: "Dessert",
    priceOnSite: 4,
    priceTakeaway: 4,
    ingredients: [
      { ingredient: "Pitchounes chocolat", quantity: 1, quantityUnit: "piece", channel: "BOTH" },
      { ingredient: "Sachet pitchoune (à emporter)", quantity: 1, quantityUnit: "piece", channel: "EMPORTER" },
    ],
  },
  { name: "Eau plate (50cl)", category: "Boissons", priceOnSite: 3, priceTakeaway: 3, ingredients: [{ ingredient: "Eau plate Evian 50cl", quantity: 1, quantityUnit: "piece", channel: "BOTH" }] },
  { name: "Eau pétillante (50cl)", category: "Boissons", priceOnSite: 3, priceTakeaway: 3, ingredients: [{ ingredient: "Eau Badoit 50cl", quantity: 1, quantityUnit: "piece", channel: "BOTH" }] },
  { name: "Citronade 33cl", category: "Boissons", priceOnSite: 3.5, priceTakeaway: 3.5, ingredients: boissonSoftLine("Citronnade / Limonade", "Sticker boisson Citronnade") },
  { name: "Limonade 33cl", category: "Boissons", priceOnSite: 3.5, priceTakeaway: 3.5, ingredients: boissonSoftLine("Citronnade / Limonade", "Sticker boisson Limonade") },
  { name: "Oranginade 33cl", category: "Boissons", priceOnSite: 3.5, priceTakeaway: 3.5, ingredients: boissonSoftLine("Oranginade", "Sticker boisson Oranginade") },
  { name: "Thé vert pêche 33cl", category: "Boissons", priceOnSite: 3.5, priceTakeaway: 3.5, ingredients: boissonSoftLine("Thé pêche", "Sticker boisson Thé pêche") },
  { name: "Jus de pomme (25cl)", category: "Boissons", priceOnSite: 5, priceTakeaway: 5, ingredients: singleLine("Jus de pomme") },

  // Boissons chaudes : prix de vente connus (Prix menu Nice.xlsx), coût matière à définir (0€ en attendant).
  { name: "Café", category: "Boissons chaudes", priceOnSite: 2, priceTakeaway: 1.8, ingredients: singleLine("Café") },
  { name: "Double Café", category: "Boissons chaudes", priceOnSite: 3.5, priceTakeaway: 3.5, ingredients: singleLine("Double Café") },
  { name: "Café long", category: "Boissons chaudes", priceOnSite: 2.2, priceTakeaway: 1.8, ingredients: singleLine("Café long") },
  { name: "Café au lait", category: "Boissons chaudes", priceOnSite: 3.5, priceTakeaway: 3.5, ingredients: singleLine("Café au lait") },
  { name: "Café au lait Tartine", category: "Boissons chaudes", priceOnSite: 4, priceTakeaway: 4, ingredients: singleLine("Café au lait Tartine") },
  { name: "Café au lait Brioche", category: "Boissons chaudes", priceOnSite: 4, priceTakeaway: 4, ingredients: singleLine("Café au lait Brioche") },
  { name: "Lait Mousse", category: "Boissons chaudes", priceOnSite: 4, priceTakeaway: 4, ingredients: singleLine("Lait Mousse") },
  { name: "Lait Ribot Chaud", category: "Boissons chaudes", priceOnSite: 4, priceTakeaway: 4, ingredients: singleLine("Lait Ribot Chaud") },
  { name: "Cacao", category: "Boissons chaudes", priceOnSite: 4, priceTakeaway: 4, ingredients: singleLine("Cacao") },
  { name: "Thé", category: "Boissons chaudes", priceOnSite: 3.5, priceTakeaway: 3.5, ingredients: singleLine("Thé") },
  { name: "Extra lait végétal", category: "Boissons chaudes", priceOnSite: 0.5, priceTakeaway: 0.5, ingredients: singleLine("Extra lait végétal") },

  // Alcool : prix de vente connus, coût matière à définir (0€ en attendant).
  { name: "Bière blonde 33cl", category: "Alcool", priceOnSite: 5.5, priceTakeaway: 5.5, ingredients: singleLine("Bière blonde 33cl") },
  { name: "Bière blanche 33cl", category: "Alcool", priceOnSite: 5.5, priceTakeaway: 5.5, ingredients: singleLine("Bière blanche 33cl") },
  { name: "Cidre brut 33cl", category: "Alcool", priceOnSite: 5.5, priceTakeaway: 5.5, ingredients: singleLine("Cidre brut 33cl") },
  { name: "Vin rouge 14cl", category: "Alcool", priceOnSite: 4.5, priceTakeaway: 4.5, ingredients: singleLine("Vin rouge 14cl") },
  { name: "Vin blanc 14cl", category: "Alcool", priceOnSite: 4.5, priceTakeaway: 4.5, ingredients: singleLine("Vin blanc 14cl") },
  { name: "Vin rosé 14cl", category: "Alcool", priceOnSite: 4.5, priceTakeaway: 4.5, ingredients: singleLine("Vin rosé 14cl") },
  { name: "Vin rouge 75cl", category: "Alcool", priceOnSite: 22, priceTakeaway: 22, ingredients: singleLine("Vin rouge 75cl") },
  { name: "Vin blanc 75cl", category: "Alcool", priceOnSite: 22, priceTakeaway: 22, ingredients: singleLine("Vin blanc 75cl") },
];

async function upsertIngredient(restaurantId: string, data: { name: string; unit: IngredientUnit; price: number }) {
  const existing = await prisma.ingredient.findFirst({ where: { restaurantId, name: data.name } });
  if (existing) {
    if (existing.price !== data.price || existing.unit !== data.unit) {
      await prisma.ingredient.update({
        where: { id: existing.id },
        data: { price: data.price, unit: data.unit, priceHistory: { create: { price: data.price } } },
      });
    }
    return existing.id;
  }
  const created = await prisma.ingredient.create({
    data: { ...data, restaurantId, priceHistory: { create: { price: data.price } } },
  });
  return created.id;
}

async function upsertProduct(
  restaurantId: string,
  data: (typeof productsData)[number],
  idByName: Record<string, string>
) {
  const ingredients = data.ingredients.map((i) => ({
    ingredientId: idByName[i.ingredient],
    quantity: i.quantity,
    quantityUnit: i.quantityUnit,
    channel: i.channel,
  }));

  const existing = await prisma.product.findFirst({ where: { restaurantId, name: data.name } });
  if (existing) {
    await prisma.productIngredient.deleteMany({ where: { productId: existing.id } });
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        category: data.category,
        priceOnSite: data.priceOnSite,
        priceTakeaway: data.priceTakeaway,
        ingredients: { create: ingredients },
      },
    });
  } else {
    await prisma.product.create({
      data: {
        name: data.name,
        category: data.category,
        priceOnSite: data.priceOnSite,
        priceTakeaway: data.priceTakeaway,
        restaurantId,
        ingredients: { create: ingredients },
      },
    });
  }
}

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "amone-nice" },
    update: {},
    create: { name: "Amoné Nice", slug: "amone-nice" },
  });

  const idByName: Record<string, string> = {};
  for (const ing of ingredientsData) {
    idByName[ing.name] = await upsertIngredient(restaurant.id, ing);
  }
  for (const prod of productsData) {
    await upsertProduct(restaurant.id, prod, idByName);
  }
  console.log(`Importé : ${ingredientsData.length} ingrédients, ${productsData.length} produits.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
