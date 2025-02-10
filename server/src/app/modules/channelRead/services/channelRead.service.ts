import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PostgresDatabaseProviderService } from '@src/providers/database/postgres/provider.service';

@Injectable()
export class ChannelReadService {
  constructor(private readonly db: PostgresDatabaseProviderService) {}

  public async createOrUpdateChannelRead(
    data: Prisma.UserChannelReadCreateManyInput
  ) {
    return await this.db.userChannelRead.upsert({
      where: {
        unique_profile_channel: {
          profileId: data.profileId,
          channel_id: data.channel_id,
        },
      },
      update: {
        last_read_at: data.last_read_at,
      },
      create: data,
      include: {
        channel: {
          include: {
            server: true,
          },
        },
      },
    });
  }

  public async getChannelReadByProfleId(profileId: string) {
    return await this.db.userChannelRead.findMany({
      where: {
        profileId,
      },
      include: {
        channel: {
          include: {
            server: true,
          },
        },
      },
    });
  }
}
