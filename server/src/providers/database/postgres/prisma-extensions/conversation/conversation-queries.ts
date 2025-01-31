import { Prisma } from '@prisma/client';
import { ConversationWithMemberAndDirectMessage } from '@src/app/modules/conversation/types/conversation.types';
import { AppHelperService } from '@src/common/helpers/app.helper';

export const conversationQueries = {
  async findMany({
    args,
    query,
  }: {
    args: Prisma.ConversationFindManyArgs;
    query: any;
  }) {
    const results = (await query(
      args
    )) as ConversationWithMemberAndDirectMessage[];
    const key = process.env.HASH_MESSAGE_SECRET_KEY_DB;

    for (const result of results) {
      for (const messsage of result.directMessages) {
        messsage.content = AppHelperService.decrypt(messsage.content, key);
      }
    }

    return results;
  },
};
