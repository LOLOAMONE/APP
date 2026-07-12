-- CreateTable
CREATE TABLE "ScheduleTemplateEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    CONSTRAINT "ScheduleTemplateEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackagingUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "orderSchedule" TEXT,
    "minimumOrder" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "clientCode" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Supplier" ("clientCode", "createdAt", "email", "id", "minimumOrder", "name", "notes", "orderSchedule", "phone", "updatedAt") SELECT "clientCode", "createdAt", "email", "id", "minimumOrder", "name", "notes", "orderSchedule", "phone", "updatedAt" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new_Supplier" RENAME TO "Supplier";
CREATE TABLE "new_SupplierItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "reference" TEXT,
    "designation" TEXT NOT NULL,
    "packaging" TEXT,
    "orderQuantity" REAL NOT NULL DEFAULT 0,
    "unitPriceHT" REAL,
    "casePriceHT" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SupplierItem" ("casePriceHT", "createdAt", "designation", "id", "orderQuantity", "packaging", "reference", "supplierId", "unitPriceHT", "updatedAt") SELECT "casePriceHT", "createdAt", "designation", "id", "orderQuantity", "packaging", "reference", "supplierId", "unitPriceHT", "updatedAt" FROM "SupplierItem";
DROP TABLE "SupplierItem";
ALTER TABLE "new_SupplierItem" RENAME TO "SupplierItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PackagingUnit_label_key" ON "PackagingUnit"("label");
