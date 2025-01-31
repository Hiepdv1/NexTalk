import { Prisma } from '@prisma/client';
import { ServerWithChannelsMembersAndConversations } from '@src/app/modules/server/types/server.types';
import { AppHelperService } from '@src/common/helpers/app.helper';

export const messageMutations = {
  async update({ args, query }: { args: Prisma.ServerUpdateArgs; query: any }) {
    const updated = (await query(
      args
    )) as ServerWithChannelsMembersAndConversations;

    const key = process.env.HASH_MESSAGE_SECRET_KEY_DB;

    updated.channels.forEach((channel) => {
      channel.messages.forEach((message) => {
        message.content = AppHelperService.decrypt(message.content, key);
      });
    });

    updated.members.forEach((member) => {
      [
        ...member.conversationsInitiated,
        ...member.conversationsReceived,
      ].forEach((conversation) => {
        conversation.directMessages.forEach((message) => {
          message.content = AppHelperService.decrypt(message.content, key);
        });
      });
    });

    return updated;
  },
};
