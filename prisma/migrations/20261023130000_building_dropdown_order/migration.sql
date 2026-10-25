ALTER TABLE "Building" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

WITH ordered_buildings AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "name" ASC, "id" ASC) - 1 AS position
  FROM "Building"
)
UPDATE "Building" AS building
SET "sortOrder" = ordered_buildings.position
FROM ordered_buildings
WHERE building."id" = ordered_buildings."id";

CREATE INDEX "Building_sortOrder_name_idx" ON "Building"("sortOrder", "name");
