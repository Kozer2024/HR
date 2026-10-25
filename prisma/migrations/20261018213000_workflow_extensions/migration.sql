ALTER TABLE "Location" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Location" ADD COLUMN "dimensions" TEXT;
CREATE UNIQUE INDEX "Location_externalId_key" ON "Location"("externalId");

CREATE TABLE "ScreenSlot" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ScreenSlot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScreenSlot_locationId_startAt_endAt_idx" ON "ScreenSlot"("locationId", "startAt", "endAt");
ALTER TABLE "ScreenSlot" ADD CONSTRAINT "ScreenSlot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BookingScreenSlot" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "BookingScreenSlot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BookingScreenSlot_bookingId_slotId_key" ON "BookingScreenSlot"("bookingId", "slotId");
ALTER TABLE "BookingScreenSlot" ADD CONSTRAINT "BookingScreenSlot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingScreenSlot" ADD CONSTRAINT "BookingScreenSlot_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ScreenSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BookingHistory" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "actorId" TEXT,
  "status" "BookingStatus" NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BookingHistory_bookingId_createdAt_idx" ON "BookingHistory"("bookingId", "createdAt");
ALTER TABLE "BookingHistory" ADD CONSTRAINT "BookingHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "InstallationAccessLink" ("id" TEXT NOT NULL, "bookingGroupId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), CONSTRAINT "InstallationAccessLink_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "InstallationAccessLink_tokenHash_key" ON "InstallationAccessLink"("tokenHash");
CREATE INDEX "InstallationAccessLink_bookingGroupId_idx" ON "InstallationAccessLink"("bookingGroupId");
CREATE TABLE "Executor" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "telegram" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Executor_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ExecutorAccess" ("id" TEXT NOT NULL, "executorId" TEXT NOT NULL, "accessId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "revokedAt" TIMESTAMP(3), CONSTRAINT "ExecutorAccess_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ExecutorAccess_executorId_accessId_key" ON "ExecutorAccess"("executorId", "accessId");
ALTER TABLE "ExecutorAccess" ADD CONSTRAINT "ExecutorAccess_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "Executor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExecutorAccess" ADD CONSTRAINT "ExecutorAccess_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES "InstallationAccessLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "InstallationComment" ("id" TEXT NOT NULL, "taskId" TEXT NOT NULL, "authorUserId" TEXT, "authorExecutorId" TEXT, "text" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "InstallationComment_pkey" PRIMARY KEY ("id"));
CREATE INDEX "InstallationComment_taskId_createdAt_idx" ON "InstallationComment"("taskId", "createdAt");
ALTER TABLE "InstallationComment" ADD CONSTRAINT "InstallationComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ExecutionTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstallationComment" ADD CONSTRAINT "InstallationComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InstallationComment" ADD CONSTRAINT "InstallationComment_authorExecutorId_fkey" FOREIGN KEY ("authorExecutorId") REFERENCES "Executor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
