import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const RESTAURANT_SLUG = "amone-nice";
const RESTAURANT_NAME = "Amoné Nice";

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: RESTAURANT_SLUG },
    update: {},
    create: { name: RESTAURANT_NAME, slug: RESTAURANT_SLUG },
  });

  const username = process.env.ADMIN_USERNAME || "direction";
  const password = process.env.ADMIN_PASSWORD || "changeme123";

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Le compte direction "${username}" existe déjà, rien à faire.`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { username, passwordHash } });
    await prisma.userRestaurant.create({
      data: { userId: user.id, restaurantId: restaurant.id, role: "ADMIN" },
    });
    console.log(`Compte direction créé : ${username} / ${password}`);
    console.log("Pensez à changer ce mot de passe après la première connexion.");
  }

  // Optionnel : compte SUPER_ADMIN (maison mère), bootstrap uniquement via variables d'environnement.
  const superAdminUsername = process.env.SUPER_ADMIN_USERNAME;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (superAdminUsername && superAdminPassword) {
    const existingSuperAdmin = await prisma.user.findUnique({ where: { username: superAdminUsername } });
    if (existingSuperAdmin) {
      console.log(`Le compte super admin "${superAdminUsername}" existe déjà, rien à faire.`);
    } else {
      const passwordHash = await bcrypt.hash(superAdminPassword, 10);
      await prisma.user.create({
        data: { username: superAdminUsername, passwordHash, isSuperAdmin: true },
      });
      console.log(`Compte super admin créé : ${superAdminUsername} / ${superAdminPassword}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
