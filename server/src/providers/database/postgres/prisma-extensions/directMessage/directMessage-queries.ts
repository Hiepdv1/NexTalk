import { Prisma } from '@prisma/client';
import { AppHelperService } from '@src/common/helpers/app.helper';

export const directMesssageQueries = {
  async findFirst({
    args,
    query,
  }: {
    args: Prisma.DirectMessageFindFirstArgs;
    query: any;
  }) {
    const result = await query(args);
    if (result?.content) {
      result.content = AppHelperService.decrypt(
        result.content,
        process.env.HASH_MESSAGE_SECRET_KEY_DB
      );
    }
    return result;
  },

  async findUnique({
    args,
    query,
  }: {
    args: Prisma.DirectMessageFindUniqueArgs;
    query: any;
  }) {
    const result = await query(args);
    if (result?.content) {
      result.content = AppHelperService.decrypt(
        result.content,
        process.env.HASH_MESSAGE_SECRET_KEY_DB
      );
    }
    return result;
  },

  async findMany({
    args,
    query,
  }: {
    args: Prisma.DirectMessageFindManyArgs;
    query: any;
  }) {
    const results = (await query(
      args
    )) as Prisma.DirectMessageCreateManyInput[];
    const key = process.env.HASH_MESSAGE_SECRET_KEY_DB;

    results.forEach((value) => {
      if (value.content) {
        value.content = AppHelperService.decrypt(value.content, key);
      }
    });

    return results;
  },
};
