-- CreateTable
CREATE TABLE "MeasureUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "supplier" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Ingredient" ("createdAt", "id", "name", "price", "supplier", "unit", "updatedAt") SELECT "createdAt", "id", "name", "price", "supplier", "unit", "updatedAt" FROM "Ingredient";
DROP TABLE "Ingredient";
ALTER TABLE "new_Ingredient" RENAME TO "Ingredient";
CREATE TABLE "new_Menu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "priceOnSite" REAL NOT NULL,
    "priceTakeaway" REAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Menu" ("createdAt", "id", "name", "priceOnSite", "priceTakeaway", "updatedAt") SELECT "createdAt", "id", "name", "priceOnSite", "priceTakeaway", "updatedAt" FROM "Menu";
DROP TABLE "Menu";
ALTER TABLE "new_Menu" RENAME TO "Menu";
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Autre',
    "priceOnSite" REAL NOT NULL,
    "priceTakeaway" REAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("category", "createdAt", "id", "name", "priceOnSite", "priceTakeaway", "updatedAt") SELECT "category", "createdAt", "id", "name", "priceOnSite", "priceTakeaway", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MeasureUnit_label_key" ON "MeasureUnit"("label");
