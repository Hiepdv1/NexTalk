import { Prisma } from '@prisma/client';

export type ConversationWithMemberAndDirectMessage =
  Prisma.ConversationGetPayload<{
    include: {
      memberOne: {
        include: {
          profile: true;
        };
      };
      memberTwo: {
        include: {
          profile: true;
        };
      };
      directMessages: {
        include: {
          member: {
            include: {
              profile: true;
            };
          };
        };
      };
    };
  }>;
