import { Prisma } from '@prisma/client';
import { ServerWithChannelsMembersAndConversations } from '@src/app/modules/server/types/server.types';
import { AppHelperService } from '@src/common/helpers/app.helper';

const serverQueries = {
  async findFirst({
    args,
    query,
  }: {
    args: Prisma.ServerFindFirstArgs;
    query: any;
  }) {
    const result = await query(args);
    const key = process.env.HASH_MESSAGE_SECRET_KEY_DB;

    if (result?.channels && result.channels.length > 0) {
      result.channels = result.channels.forEach((channel) => {
        if (channel?.messages && channel?.messages.length > 0) {
          channel.messages.forEach((message) => {
            message.content = AppHelperService.decrypt(message.content, key);
          });
        }
      });
    }

    return result;
  },

  async update({ args, query }: { args: Prisma.ServerUpdateArgs; query: any }) {
    const result = (await query(
      args
    )) as ServerWithChannelsMembersAndConversations;
    const key = process.env.HASH_MESSAGE_SECRET_KEY_DB;

    if (Array.isArray(result.channels)) {
      for (const channel of result.channels) {
        if (Array.isArray(channel.messages)) {
          for (const message of channel.messages) {
            message.content = AppHelperService.decrypt(message.content, key);
          }
        }
      }
    }

    if (Array.isArray(result.members)) {
      for (const member of result.members) {
        const conversations = [
          ...(member.conversationsInitiated || []),
          ...(member.conversationsReceived || []),
        ];
        for (const conversation of conversations) {
          for (const messsage of conversation.directMessages) {
            messsage.content = AppHelperService.decrypt(messsage.content, key);
          }
        }
      }
    }

    return result;
  },

  async findMany({
    args,
    query,
  }: {
    args: Prisma.ServerFindManyArgs;
    query: any;
  }) {
    const results = (await query(
      args
    )) as ServerWithChannelsMembersAndConversations[];
    const key = process.env.HASH_MESSAGE_SECRET_KEY_DB;

    for (const result of results) {
      if (result.channels) {
        for (const channel of result.channels) {
          if (channel.messages?.length) {
            for (const message of channel.messages) {
              message.content = AppHelperService.decrypt(message.content, key);
            }
          }
        }
      }

      if (result.members) {
        for (const member of result.members) {
          const conversations = [
            ...(member.conversationsInitiated || []),
            ...(member.conversationsReceived || []),
          ];

          for (const conversation of conversations) {
            if (conversation.directMessages?.length) {
              for (const message of conversation.directMessages) {
                message.content = AppHelperService.decrypt(
                  message.content,
                  key
                );
              }
            }
          }
        }
      }
    }

    return results;
  },
};

export default serverQueries;
