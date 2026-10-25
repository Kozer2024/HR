CREATE TYPE "InstallationEventAction" AS ENUM ('CHECKED', 'UNCHECKED');

CREATE TABLE "InstallationEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "action" "InstallationEventAction" NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InstallationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InstallationEvent_bookingId_createdAt_idx" ON "InstallationEvent"("bookingId", "createdAt");

ALTER TABLE "InstallationEvent" ADD CONSTRAINT "InstallationEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
