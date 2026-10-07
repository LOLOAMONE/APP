ALTER TABLE "Restaurant" ADD COLUMN "clientFieldConfig" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "CrmContact" ADD COLUMN "customValues" TEXT NOT NULL DEFAULT '{}';
