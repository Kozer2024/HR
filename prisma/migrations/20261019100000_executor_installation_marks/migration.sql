ALTER TABLE "Executor" ADD COLUMN IF NOT EXISTS "studyGroup" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "installationMarkedById" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "installationMarkedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_installationMarkedById_fkey" FOREIGN KEY ("installationMarkedById") REFERENCES "Executor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Booking_installationMarkedById_idx" ON "Booking"("installationMarkedById");
