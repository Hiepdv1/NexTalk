import { Prisma } from '@prisma/client';

export type ServerWithChannelsMembersAndDirectMessages =
  Prisma.ServerGetPayload<{
    include: {
      channels: true;
      members: {
        include: {
          profile: true;
          conversationsInitiated: true;
          conversationsReceived: true;
        };
      };
    };
  }>;

export type ServerWithChannelsMembersAndConversations =
  Prisma.ServerGetPayload<{
    include: {
      channels: {
        include: {
          messages: true;
        };
      };
      members: {
        include: {
          conversationsInitiated: {
            include: {
              directMessages: true;
            };
          };
          conversationsReceived: {
            include: {
              directMessages: true;
            };
          };
          profile: true;
        };
      };
    };
  }>;
