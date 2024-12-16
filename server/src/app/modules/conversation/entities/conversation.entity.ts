import { Prisma } from '@prisma/client';

export type ConversationWithRelations = Prisma.ConversationGetPayload<{
  include: {
    memberOne: true;
    memberTwo: true;
  };
}>;
