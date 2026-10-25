-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "objects" TEXT[] DEFAULT ARRAY[]::TEXT[];
