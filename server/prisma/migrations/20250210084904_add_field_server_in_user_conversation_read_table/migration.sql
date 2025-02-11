/*
  Warnings:

  - Added the required column `serverId` to the `UserConversationRead` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserConversationRead" ADD COLUMN     "serverId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "UserConversationRead" ADD CONSTRAINT "UserConversationRead_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
