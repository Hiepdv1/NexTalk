import { Prisma } from '@prisma/client';

export type ServerWithRelations = Prisma.ServerGetPayload<{
  include: {
    channels: true;
    members: {
      include: {
        profile: true;
      };
    };
  };
}>;
