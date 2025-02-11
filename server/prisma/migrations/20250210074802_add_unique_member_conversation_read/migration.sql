/*
  Warnings:

  - A unique constraint covering the columns `[memberId,conversationId]` on the table `UserConversationRead` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserConversationRead_memberId_conversationId_key" ON "UserConversationRead"("memberId", "conversationId");
