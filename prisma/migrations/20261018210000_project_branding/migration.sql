-- PRoject branding, contacts, study groups and unlimited location capacity.
CREATE TYPE "LocationType_new" AS ENUM ('POSTER', 'PRISM', 'BANNER', 'VIDEO');
ALTER TABLE "Location" ALTER COLUMN "type" TYPE "LocationType_new" USING (CASE "type"::text WHEN 'STAND' THEN 'PRISM' WHEN 'SCREEN_OTHER' THEN 'VIDEO' ELSE "type"::text END)::"LocationType_new";
DROP TYPE "LocationType";
ALTER TYPE "LocationType_new" RENAME TO "LocationType";

ALTER TABLE "User" ADD COLUMN "studyGroup" TEXT;
ALTER TABLE "Location" ALTER COLUMN "capacity" DROP NOT NULL;
ALTER TABLE "Location" ADD COLUMN "isUnlimitedCapacity" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "SiteSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

CREATE TABLE "AdminContact" (
  "id" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "telegram" TEXT,
  "extraText" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminContact_pkey" PRIMARY KEY ("id")
);
