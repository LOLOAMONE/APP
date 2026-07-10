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
];

async function upsertIngredient(data: { name: string; unit: IngredientUnit; price: number }) {
  const existing = await prisma.ingredient.findFirst({ where: { name: data.name } });
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
    data: { ...data, priceHistory: { create: { price: data.price } } },
  });
  return created.id;
}

async function upsertProduct(
  data: (typeof productsData)[number],
  idByName: Record<string, string>
) {
  const ingredients = data.ingredients.map((i) => ({
    ingredientId: idByName[i.ingredient],
    quantity: i.quantity,
    quantityUnit: i.quantityUnit,
    channel: i.channel,
  }));

  const existing = await prisma.product.findFirst({ where: { name: data.name } });
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
        ingredients: { create: ingredients },
      },
    });
  }
}

async function main() {
  const idByName: Record<string, string> = {};
  for (const ing of ingredientsData) {
    idByName[ing.name] = await upsertIngredient(ing);
  }
  for (const prod of productsData) {
    await upsertProduct(prod, idByName);
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
