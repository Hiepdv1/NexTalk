import { Prisma } from '@prisma/client';
import { AppHelperService } from '@src/common/helpers/app.helper';

export const messageMutations = {
  async create({
    args,
    query,
  }: {
    args: Prisma.MessageCreateArgs;
    query: any;
  }) {
    args.data.content = AppHelperService.encrypt(
      args.data.content,
      process.env.HASH_MESSAGE_SECRET_KEY_DB
    );
    return query(args);
  },

  async update({
    args,
    query,
  }: {
    args: Prisma.MessageUpdateArgs;
    query: any;
  }) {
    args.data.content = AppHelperService.encrypt(
      args.data.content as string,
      process.env.HASH_MESSAGE_SECRET_KEY_DB
    );
    return query(args);
  },
};
