-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('DROPBOX', 'CLOUDINARY');

-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "storageType" "StorageType";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "storageType" "StorageType";

-- CreateTable
CREATE TABLE "UserChannelRead" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserChannelRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TempStoreFile" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "storageType" "StorageType" NOT NULL,
    "messageType" "MessageType" NOT NULL,

    CONSTRAINT "TempStoreFile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserChannelRead" ADD CONSTRAINT "UserChannelRead_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChannelRead" ADD CONSTRAINT "UserChannelRead_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
