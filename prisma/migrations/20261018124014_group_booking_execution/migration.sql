-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookingGroupId" TEXT;

-- CreateIndex
CREATE INDEX "Booking_bookingGroupId_idx" ON "Booking"("bookingGroupId");
