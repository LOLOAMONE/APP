CREATE TABLE "MarketingPartner" (
 "id" TEXT NOT NULL PRIMARY KEY, "restaurantId" TEXT NOT NULL, "sourceId" TEXT NOT NULL,
 "name" TEXT NOT NULL, "type" TEXT NOT NULL, "profile" TEXT NOT NULL DEFAULT '{}',
 "status" TEXT NOT NULL DEFAULT 'À contacter', "lastContactDate" TEXT, "nextContactDate" TEXT,
 "optOut" BOOLEAN NOT NULL DEFAULT false, "notes" TEXT NOT NULL DEFAULT '',
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
 CONSTRAINT "MarketingPartner_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MarketingPartner_restaurantId_sourceId_key" ON "MarketingPartner"("restaurantId", "sourceId");
