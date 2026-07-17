-- Migration multi-restaurants, auto-suffisante (schéma + backfill des données existantes),
-- pour qu'un simple `prisma migrate deploy` suffise sur n'importe quel environnement (VPS
-- compris) sans étape manuelle entre deux migrations.

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserRestaurant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRestaurant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserRestaurant_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModulePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "restaurantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModulePermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModulePermission_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables (restaurantId nullable pour l'instant, backfillé plus bas avant d'être requis)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CrmCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrmCompany_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CrmCompany" ("address", "createdAt", "email", "id", "name", "notes", "phone", "sector", "updatedAt") SELECT "address", "createdAt", "email", "id", "name", "notes", "phone", "sector", "updatedAt" FROM "CrmCompany";
DROP TABLE "CrmCompany";
ALTER TABLE "new_CrmCompany" RENAME TO "CrmCompany";
CREATE TABLE "new_CrmContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrmContact_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrmContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CrmContact" ("companyId", "createdAt", "email", "id", "name", "notes", "phone", "role", "updatedAt") SELECT "companyId", "createdAt", "email", "id", "name", "notes", "phone", "role", "updatedAt" FROM "CrmContact";
DROP TABLE "CrmContact";
ALTER TABLE "new_CrmContact" RENAME TO "CrmContact";
CREATE TABLE "new_CrmOpportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT,
    "title" TEXT NOT NULL,
    "companyId" TEXT,
    "contactId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'PROSPECT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "eventDate" TEXT,
    "guestCount" INTEGER,
    "amount" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrmOpportunity_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrmOpportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CrmOpportunity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CrmOpportunity" ("amount", "companyId", "contactId", "createdAt", "eventDate", "guestCount", "id", "notes", "order", "stage", "title", "updatedAt") SELECT "amount", "companyId", "contactId", "createdAt", "eventDate", "guestCount", "id", "notes", "order", "stage", "title", "updatedAt" FROM "CrmOpportunity";
DROP TABLE "CrmOpportunity";
ALTER TABLE "new_CrmOpportunity" RENAME TO "CrmOpportunity";
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "hourlyRate" REAL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("createdAt", "hourlyRate", "id", "name", "position", "updatedAt", "userId") SELECT "createdAt", "hourlyRate", "id", "name", "position", "updatedAt", "userId" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");
CREATE TABLE "new_Ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "supplier" TEXT,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ingredient_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Ingredient" ("category", "createdAt", "id", "name", "order", "price", "supplier", "unit", "updatedAt") SELECT "category", "createdAt", "id", "name", "order", "price", "supplier", "unit", "updatedAt" FROM "Ingredient";
DROP TABLE "Ingredient";
ALTER TABLE "new_Ingredient" RENAME TO "Ingredient";
CREATE TABLE "new_MeasureUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT,
    "label" TEXT NOT NULL,
    CONSTRAINT "MeasureUnit_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MeasureUnit" ("id", "label") SELECT "id", "label" FROM "MeasureUnit";
DROP TABLE "MeasureUnit";
ALTER TABLE "new_MeasureUnit" RENAME TO "MeasureUnit";
CREATE UNIQUE INDEX "MeasureUnit_restaurantId_label_key" ON "MeasureUnit"("restaurantId", "label");
CREATE TABLE "new_Menu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT,
    "name" TEXT NOT NULL,
    "priceOnSite" REAL NOT NULL,
    "priceTakeaway" REAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Menu_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Menu" ("createdAt", "id", "name", "order", "priceOnSite", "priceTakeaway", "updatedAt") SELECT "createdAt", "id", "name", "order", "priceOnSite", "priceTakeaway", "updatedAt" FROM "Menu";
DROP TABLE "Menu";
ALTER TABLE "new_Menu" RENAME TO "Menu";
CREATE TABLE "new_PackagingUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT,
    "label" TEXT NOT NULL,
    CONSTRAINT "PackagingUnit_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PackagingUnit" ("id", "label") SELECT "id", "label" FROM "PackagingUnit";
DROP TABLE "PackagingUnit";
ALTER TABLE "new_PackagingUnit" RENAME TO "PackagingUnit";
CREATE UNIQUE INDEX "PackagingUnit_restaurantId_label_key" ON "PackagingUnit"("restaurantId", "label");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Autre',
    "priceOnSite" REAL NOT NULL,
    "priceTakeaway" REAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("category", "createdAt", "id", "name", "order", "priceOnSite", "priceTakeaway", "updatedAt") SELECT "category", "createdAt", "id", "name", "order", "priceOnSite", "priceTakeaway", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE TABLE "new_Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "orderSchedule" TEXT,
    "minimumOrder" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "clientCode" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Supplier" ("category", "clientCode", "createdAt", "email", "id", "minimumOrder", "name", "notes", "order", "orderSchedule", "phone", "updatedAt") SELECT "category", "clientCode", "createdAt", "email", "id", "minimumOrder", "name", "notes", "order", "orderSchedule", "phone", "updatedAt" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new_Supplier" RENAME TO "Supplier";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT,
    "canAccessMarges" BOOLEAN NOT NULL DEFAULT false,
    "canAccessMercuriale" BOOLEAN NOT NULL DEFAULT false,
    "canAccessCrm" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("canAccessCrm", "canAccessMarges", "canAccessMercuriale", "createdAt", "id", "passwordHash", "role", "username") SELECT "canAccessCrm", "canAccessMarges", "canAccessMercuriale", "createdAt", "id", "passwordHash", "role", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserRestaurant_userId_restaurantId_key" ON "UserRestaurant"("userId", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "ModulePermission_userId_module_restaurantId_key" ON "ModulePermission"("userId", "module", "restaurantId");

-- Backfill : crée le restaurant par défaut "Amoné Nice" et y rattache toutes les données
-- métier existantes (installation mono-restaurant préexistante), avant que restaurantId ne
-- devienne obligatoire plus bas. Idempotent (peut être rejoué sans effet de bord).
INSERT INTO "Restaurant" ("id", "name", "slug", "status", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'Amoné Nice', 'amone-nice', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Restaurant" WHERE "slug" = 'amone-nice');

UPDATE "Employee" SET "restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice') WHERE "restaurantId" IS NULL;
UPDATE "Ingredient" SET "restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice') WHERE "restaurantId" IS NULL;
UPDATE "MeasureUnit" SET "restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice') WHERE "restaurantId" IS NULL;
UPDATE "Product" SET "restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice') WHERE "restaurantId" IS NULL;
UPDATE "Menu" SET "restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice') WHERE "restaurantId" IS NULL;
UPDATE "Supplier" SET "restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice') WHERE "restaurantId" IS NULL;
UPDATE "PackagingUnit" SET "restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice') WHERE "restaurantId" IS NULL;
UPDATE "CrmCompany" SET "restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice') WHERE "restaurantId" IS NULL;
UPDATE "CrmContact" SET "restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice') WHERE "restaurantId" IS NULL;
UPDATE "CrmOpportunity" SET "restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice') WHERE "restaurantId" IS NULL;

-- Convertit chaque User.role/canAccessXxx existant en une ligne UserRestaurant + ModulePermission
-- sur le restaurant par défaut (idempotent via NOT EXISTS).
INSERT INTO "UserRestaurant" ("id", "userId", "restaurantId", "role", "createdAt")
SELECT lower(hex(randomblob(16))), "id", (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice'), COALESCE("role", 'EMPLOYEE'), CURRENT_TIMESTAMP
FROM "User"
WHERE NOT EXISTS (
  SELECT 1 FROM "UserRestaurant"
  WHERE "UserRestaurant"."userId" = "User"."id"
    AND "UserRestaurant"."restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice')
);

INSERT INTO "ModulePermission" ("id", "userId", "module", "restaurantId", "createdAt")
SELECT lower(hex(randomblob(16))), "id", 'marges', (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice'), CURRENT_TIMESTAMP
FROM "User"
WHERE "role" IS NOT NULL AND "role" != 'ADMIN' AND "canAccessMarges" = 1
  AND NOT EXISTS (
    SELECT 1 FROM "ModulePermission"
    WHERE "ModulePermission"."userId" = "User"."id" AND "ModulePermission"."module" = 'marges'
      AND "ModulePermission"."restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice')
  );

INSERT INTO "ModulePermission" ("id", "userId", "module", "restaurantId", "createdAt")
SELECT lower(hex(randomblob(16))), "id", 'mercuriale', (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice'), CURRENT_TIMESTAMP
FROM "User"
WHERE "role" IS NOT NULL AND "role" != 'ADMIN' AND "canAccessMercuriale" = 1
  AND NOT EXISTS (
    SELECT 1 FROM "ModulePermission"
    WHERE "ModulePermission"."userId" = "User"."id" AND "ModulePermission"."module" = 'mercuriale'
      AND "ModulePermission"."restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice')
  );

INSERT INTO "ModulePermission" ("id", "userId", "module", "restaurantId", "createdAt")
SELECT lower(hex(randomblob(16))), "id", 'crm', (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice'), CURRENT_TIMESTAMP
FROM "User"
WHERE "role" IS NOT NULL AND "role" != 'ADMIN' AND "canAccessCrm" = 1
  AND NOT EXISTS (
    SELECT 1 FROM "ModulePermission"
    WHERE "ModulePermission"."userId" = "User"."id" AND "ModulePermission"."module" = 'crm'
      AND "ModulePermission"."restaurantId" = (SELECT "id" FROM "Restaurant" WHERE "slug" = 'amone-nice')
  );

-- RedefineTables (restaurantId devient obligatoire partout, colonnes historiques de User retirées)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new2_CrmCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrmCompany_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new2_CrmCompany" ("address", "createdAt", "email", "id", "name", "notes", "phone", "restaurantId", "sector", "updatedAt") SELECT "address", "createdAt", "email", "id", "name", "notes", "phone", "restaurantId", "sector", "updatedAt" FROM "CrmCompany";
DROP TABLE "CrmCompany";
ALTER TABLE "new2_CrmCompany" RENAME TO "CrmCompany";
CREATE TABLE "new2_CrmContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrmContact_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrmContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new2_CrmContact" ("companyId", "createdAt", "email", "id", "name", "notes", "phone", "restaurantId", "role", "updatedAt") SELECT "companyId", "createdAt", "email", "id", "name", "notes", "phone", "restaurantId", "role", "updatedAt" FROM "CrmContact";
DROP TABLE "CrmContact";
ALTER TABLE "new2_CrmContact" RENAME TO "CrmContact";
CREATE TABLE "new2_CrmOpportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "companyId" TEXT,
    "contactId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'PROSPECT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "eventDate" TEXT,
    "guestCount" INTEGER,
    "amount" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrmOpportunity_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrmOpportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CrmOpportunity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new2_CrmOpportunity" ("amount", "companyId", "contactId", "createdAt", "eventDate", "guestCount", "id", "notes", "order", "restaurantId", "stage", "title", "updatedAt") SELECT "amount", "companyId", "contactId", "createdAt", "eventDate", "guestCount", "id", "notes", "order", "restaurantId", "stage", "title", "updatedAt" FROM "CrmOpportunity";
DROP TABLE "CrmOpportunity";
ALTER TABLE "new2_CrmOpportunity" RENAME TO "CrmOpportunity";
CREATE TABLE "new2_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "hourlyRate" REAL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new2_Employee" ("createdAt", "hourlyRate", "id", "name", "position", "restaurantId", "updatedAt", "userId") SELECT "createdAt", "hourlyRate", "id", "name", "position", "restaurantId", "updatedAt", "userId" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new2_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");
CREATE TABLE "new2_Ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "supplier" TEXT,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ingredient_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new2_Ingredient" ("category", "createdAt", "id", "name", "order", "price", "restaurantId", "supplier", "unit", "updatedAt") SELECT "category", "createdAt", "id", "name", "order", "price", "restaurantId", "supplier", "unit", "updatedAt" FROM "Ingredient";
DROP TABLE "Ingredient";
ALTER TABLE "new2_Ingredient" RENAME TO "Ingredient";
CREATE TABLE "new2_MeasureUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "MeasureUnit_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new2_MeasureUnit" ("id", "label", "restaurantId") SELECT "id", "label", "restaurantId" FROM "MeasureUnit";
DROP TABLE "MeasureUnit";
ALTER TABLE "new2_MeasureUnit" RENAME TO "MeasureUnit";
CREATE UNIQUE INDEX "MeasureUnit_restaurantId_label_key" ON "MeasureUnit"("restaurantId", "label");
CREATE TABLE "new2_Menu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceOnSite" REAL NOT NULL,
    "priceTakeaway" REAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Menu_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new2_Menu" ("createdAt", "id", "name", "order", "priceOnSite", "priceTakeaway", "restaurantId", "updatedAt") SELECT "createdAt", "id", "name", "order", "priceOnSite", "priceTakeaway", "restaurantId", "updatedAt" FROM "Menu";
DROP TABLE "Menu";
ALTER TABLE "new2_Menu" RENAME TO "Menu";
CREATE TABLE "new2_PackagingUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "PackagingUnit_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new2_PackagingUnit" ("id", "label", "restaurantId") SELECT "id", "label", "restaurantId" FROM "PackagingUnit";
DROP TABLE "PackagingUnit";
ALTER TABLE "new2_PackagingUnit" RENAME TO "PackagingUnit";
CREATE UNIQUE INDEX "PackagingUnit_restaurantId_label_key" ON "PackagingUnit"("restaurantId", "label");
CREATE TABLE "new2_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Autre',
    "priceOnSite" REAL NOT NULL,
    "priceTakeaway" REAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new2_Product" ("category", "createdAt", "id", "name", "order", "priceOnSite", "priceTakeaway", "restaurantId", "updatedAt") SELECT "category", "createdAt", "id", "name", "order", "priceOnSite", "priceTakeaway", "restaurantId", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new2_Product" RENAME TO "Product";
CREATE TABLE "new2_Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "orderSchedule" TEXT,
    "minimumOrder" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "clientCode" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new2_Supplier" ("category", "clientCode", "createdAt", "email", "id", "minimumOrder", "name", "notes", "order", "orderSchedule", "phone", "restaurantId", "updatedAt") SELECT "category", "clientCode", "createdAt", "email", "id", "minimumOrder", "name", "notes", "order", "orderSchedule", "phone", "restaurantId", "updatedAt" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new2_Supplier" RENAME TO "Supplier";
CREATE TABLE "new2_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new2_User" ("createdAt", "id", "isSuperAdmin", "passwordHash", "username") SELECT "createdAt", "id", "isSuperAdmin", "passwordHash", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new2_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
