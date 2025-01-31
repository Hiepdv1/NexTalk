/*
  Warnings:

  - A unique constraint covering the columns `[profileId,channel_id]` on the table `UserChannelRead` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserChannelRead_profileId_channel_id_key" ON "UserChannelRead"("profileId", "channel_id");
