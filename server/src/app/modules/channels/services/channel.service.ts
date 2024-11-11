import { Injectable } from '@nestjs/common';
import { ChannelType, MemberRole, Prisma } from '@prisma/client';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';

@Injectable()
export class ChannelService {
  constructor(private readonly db: PostgresDatabaseProviderService) {}

  public async getChannelServerId(serverId: string, channelId: string) {
    return await this.db.channel.findFirst({
      where: {
        id: channelId,
        serverId,
      },
    });
  }

  public async getChannelById(channelId: string) {
    return await this.db.channel.findFirst({
      where: {
        id: channelId,
      },
    });
  }

  public async CreateChannel(
    profileId: string,
    serverId: string,
    data: Partial<Prisma.ChannelCreateInput>
  ) {
    const channel = await this.db.server.update({
      where: {
        id: serverId,
        members: {
          some: {
            profileId,
            role: {
              in: [MemberRole.ADMIN, MemberRole.MODERATOR],
            },
          },
        },
      },
      data: {
        channels: {
          create: {
            profileId,
            type: data.type,
            name: data.name,
          },
        },
      },
      select: { channels: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    return channel;
  }

  public async getAllChannels(profileId: string) {
    return await this.db.channel.findMany({
      where: {
        server: {
          members: {
            some: {
              profileId,
            },
          },
        },
      },
    });
  }

  public async DeleteChannel(
    serverId: string,
    channelId: string,
    profileId: string
  ) {
    const channel = await this.db.server.update({
      where: {
        id: serverId,
        members: {
          some: {
            profileId,
            role: {
              in: [MemberRole.ADMIN, MemberRole.MODERATOR],
            },
          },
        },
        channels: {
          some: {
            id: channelId,
          },
        },
      },
      data: {
        channels: {
          delete: {
            id: channelId,
            name: {
              not: 'general',
            },
          },
        },
      },
    });

    return channel;
  }

  public async updateChannel(
    channelId: string,
    serverId: string,
    profileId: string,
    data: Partial<{ name: string; type: ChannelType }>
  ) {
    const channelUpdated = await this.db.server.update({
      where: {
        id: serverId,
        members: {
          some: {
            profileId,
            role: {
              in: [MemberRole.MODERATOR, MemberRole.ADMIN],
            },
          },
        },
        channels: {
          some: {
            id: channelId,
            name: {
              not: 'general',
            },
          },
        },
      },
      data: {
        channels: {
          update: {
            where: {
              id: channelId,
            },
            data: {
              name: data.name,
              type: data.type,
            },
          },
        },
      },
    });

    return channelUpdated;
  }

  public async getChannelAndMySelf(
    channelId: string,
    profileId: string,
    serverId: string
  ) {
    const channelPormise = this.db.channel.findUnique({
      where: {
        id: channelId,
      },
    });

    const myseltPromise = this.db.member.findFirst({
      where: {
        serverId,
        profileId,
      },
    });

    const [channel, myself] = await Promise.all([
      channelPormise,
      myseltPromise,
    ]);

    return {
      channel,
      myself,
    };
  }
}
