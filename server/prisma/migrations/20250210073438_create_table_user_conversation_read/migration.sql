-- CreateTable
CREATE TABLE "UserConversationRead" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConversationRead_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserConversationRead" ADD CONSTRAINT "UserConversationRead_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConversationRead" ADD CONSTRAINT "UserConversationRead_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
