-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "quantityUnit" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'BOTH',
    CONSTRAINT "ProductIngredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProductIngredient" ("id", "ingredientId", "productId", "quantity", "quantityUnit") SELECT "id", "ingredientId", "productId", "quantity", "quantityUnit" FROM "ProductIngredient";
DROP TABLE "ProductIngredient";
ALTER TABLE "new_ProductIngredient" RENAME TO "ProductIngredient";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
