-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
