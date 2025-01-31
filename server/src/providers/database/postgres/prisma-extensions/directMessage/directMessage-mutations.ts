import { Prisma } from '@prisma/client';
import { AppHelperService } from '@src/common/helpers/app.helper';

export const directMessageMutations = {
  async create({
    args,
    query,
  }: {
    args: Prisma.DirectMessageCreateArgs;
    query: any;
  }) {
    args.data.content = AppHelperService.encrypt(
      args.data.content,
      process.env.HASH_MESSAGE_SECRET_KEY_DB
    );

    const data = await query(args);

    data.content = AppHelperService.decrypt(
      data.content,
      process.env.HASH_MESSAGE_SECRET_KEY_DB
    );

    return data;
  },

  async update({
    args,
    query,
  }: {
    args: Prisma.DirectMessageUpdateArgs;
    query: any;
  }) {
    args.data.content = AppHelperService.encrypt(
      args.data.content as string,
      process.env.HASH_MESSAGE_SECRET_KEY_DB
    );

    const data = await query(args);

    data.content = AppHelperService.decrypt(
      data.content,
      process.env.HASH_MESSAGE_SECRET_KEY_DB
    );

    return data;
  },
};
