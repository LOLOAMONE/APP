CREATE TABLE "WorkspaceItem" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "restaurantId" TEXT NOT NULL,
 "area" TEXT NOT NULL DEFAULT 'NOTES',
 "kind" TEXT NOT NULL DEFAULT 'NOTE',
 "title" TEXT NOT NULL,
 "body" TEXT NOT NULL DEFAULT '',
 "scheduledDate" TEXT,
 "completed" BOOLEAN NOT NULL DEFAULT false,
 "pinned" BOOLEAN NOT NULL DEFAULT false,
 "archived" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" DATETIME NOT NULL,
 CONSTRAINT "WorkspaceItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WorkspaceItem_restaurantId_area_archived_idx" ON "WorkspaceItem"("restaurantId", "area", "archived");
