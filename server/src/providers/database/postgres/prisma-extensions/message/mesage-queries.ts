import { Prisma } from '@prisma/client';
import { AppHelperService } from '@src/common/helpers/app.helper';

export const messageQueries = {
  async findFirst({
    args,
    query,
  }: {
    args: Prisma.MessageFindFirstArgs;
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
    args: Prisma.MessageFindUniqueArgs;
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
    args: Prisma.MessageFindManyArgs;
    query: any;
  }) {
    const results = await query(args);
    const key = process.env.HASH_MESSAGE_SECRET_KEY_DB;

    results.forEach((value) => {
      if (value.content) {
        value.content = AppHelperService.decrypt(value.content, key);
      }
    });

    return results;
  },
};
