// Script de migration ponctuel (étape 1 → étape 2 de l'architecture multi-restaurants) :
// - crée le restaurant "Amoné Nice" s'il n'existe pas déjà,
// - rattache toutes les données métier existantes à ce restaurant,
// - convertit chaque User.role/canAccessXxx existant en UserRestaurant + ModulePermission.
// Idempotent : peut être relancé sans effet si déjà exécuté (find-or-create partout).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RESTAURANT_SLUG = "amone-nice";
const RESTAURANT_NAME = "Amoné Nice";

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: RESTAURANT_SLUG },
    update: {},
    create: { name: RESTAURANT_NAME, slug: RESTAURANT_SLUG },
  });
  console.log(`Restaurant "${restaurant.name}" (${restaurant.id})`);

  const backfillTargets: { label: string; count: () => Promise<number> }[] = [
    {
      label: "Employee",
      count: async () => {
        const r = await prisma.employee.updateMany({
          where: { restaurantId: null },
          data: { restaurantId: restaurant.id },
        });
        return r.count;
      },
    },
    {
      label: "Ingredient",
      count: async () => {
        const r = await prisma.ingredient.updateMany({
          where: { restaurantId: null },
          data: { restaurantId: restaurant.id },
        });
        return r.count;
      },
    },
    {
      label: "MeasureUnit",
      count: async () => {
        const r = await prisma.measureUnit.updateMany({
          where: { restaurantId: null },
          data: { restaurantId: restaurant.id },
        });
        return r.count;
      },
    },
    {
      label: "Product",
      count: async () => {
        const r = await prisma.product.updateMany({
          where: { restaurantId: null },
          data: { restaurantId: restaurant.id },
        });
        return r.count;
      },
    },
    {
      label: "Menu",
      count: async () => {
        const r = await prisma.menu.updateMany({
          where: { restaurantId: null },
          data: { restaurantId: restaurant.id },
        });
        return r.count;
      },
    },
    {
      label: "Supplier",
      count: async () => {
        const r = await prisma.supplier.updateMany({
          where: { restaurantId: null },
          data: { restaurantId: restaurant.id },
        });
        return r.count;
      },
    },
    {
      label: "PackagingUnit",
      count: async () => {
        const r = await prisma.packagingUnit.updateMany({
          where: { restaurantId: null },
          data: { restaurantId: restaurant.id },
        });
        return r.count;
      },
    },
    {
      label: "CrmCompany",
      count: async () => {
        const r = await prisma.crmCompany.updateMany({
          where: { restaurantId: null },
          data: { restaurantId: restaurant.id },
        });
        return r.count;
      },
    },
    {
      label: "CrmContact",
      count: async () => {
        const r = await prisma.crmContact.updateMany({
          where: { restaurantId: null },
          data: { restaurantId: restaurant.id },
        });
        return r.count;
      },
    },
    {
      label: "CrmOpportunity",
      count: async () => {
        const r = await prisma.crmOpportunity.updateMany({
          where: { restaurantId: null },
          data: { restaurantId: restaurant.id },
        });
        return r.count;
      },
    },
  ];

  for (const target of backfillTargets) {
    const n = await target.count();
    console.log(`  ${target.label}: ${n} ligne(s) rattachée(s)`);
  }

  const MODULES: { field: "canAccessMarges" | "canAccessMercuriale" | "canAccessCrm"; module: string }[] = [
    { field: "canAccessMarges", module: "marges" },
    { field: "canAccessMercuriale", module: "mercuriale" },
    { field: "canAccessCrm", module: "crm" },
  ];

  const users = await prisma.user.findMany();
  for (const user of users) {
    const role = user.role === "ADMIN" ? "ADMIN" : "EMPLOYEE";

    await prisma.userRestaurant.upsert({
      where: { userId_restaurantId: { userId: user.id, restaurantId: restaurant.id } },
      update: { role },
      create: { userId: user.id, restaurantId: restaurant.id, role },
    });

    if (role !== "ADMIN") {
      for (const { field, module } of MODULES) {
        if (!user[field]) continue;
        const existing = await prisma.modulePermission.findFirst({
          where: { userId: user.id, module, restaurantId: restaurant.id },
        });
        if (!existing) {
          await prisma.modulePermission.create({
            data: { userId: user.id, module, restaurantId: restaurant.id },
          });
        }
      }
    }

    console.log(`  User "${user.username}": role local ${role} sur ${restaurant.name}`);
  }

  console.log("Migration de données terminée.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
