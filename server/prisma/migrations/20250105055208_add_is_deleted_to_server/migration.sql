-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Server" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
