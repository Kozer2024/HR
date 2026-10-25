ALTER TYPE "LocationType" RENAME TO "LocationType_old";

CREATE TYPE "LocationType" AS ENUM ('POSTER', 'PRISM', 'BANNER', 'TELEVISION', 'LED_DISPLAY');

ALTER TABLE "Location"
  ALTER COLUMN "type" TYPE "LocationType"
  USING (
    CASE
      WHEN "type"::text = 'VIDEO' AND lower("name") LIKE '%телевизор%' THEN 'TELEVISION'
      WHEN "type"::text = 'VIDEO' THEN 'LED_DISPLAY'
      ELSE "type"::text
    END
  )::"LocationType";

DROP TYPE "LocationType_old";

UPDATE "Booking" AS booking
SET "objects" = array_replace(booking."objects", 'Видео', CASE WHEN location."type" = 'TELEVISION' THEN 'Телевизор' ELSE 'LED-дисплей' END)
FROM "Location" AS location
WHERE booking."locationId" = location."id"
  AND 'Видео' = ANY(booking."objects");

UPDATE "Booking" AS booking
SET "productQuantities" = (
  SELECT jsonb_agg(
    CASE
      WHEN item ->> 'object' = 'Видео'
        THEN jsonb_set(item, '{object}', to_jsonb(CASE WHEN location."type" = 'TELEVISION' THEN 'Телевизор' ELSE 'LED-дисплей' END))
      ELSE item
    END
  )
  FROM jsonb_array_elements(booking."productQuantities") AS item
)
FROM "Location" AS location
WHERE booking."locationId" = location."id"
  AND jsonb_typeof(booking."productQuantities") = 'array';
