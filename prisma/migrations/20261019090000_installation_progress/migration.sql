ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "installationProgress" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_installationProgress_range" CHECK ("installationProgress" >= 0 AND "installationProgress" <= 100);
