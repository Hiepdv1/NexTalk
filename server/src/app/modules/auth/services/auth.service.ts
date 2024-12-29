import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: PostgresDatabaseProviderService
  ) {}

  public async createProfile(data: Prisma.ProfileCreateInput) {
    return this.databaseService.profile.create({ data });
  }

  public async findUserById(userId?: string) {
    return this.databaseService.profile.findUnique({
      where: { userId },
    });
  }

  public async findManyUsersByUserId(userIds: Array<string>) {
    const profiles = await this.databaseService.profile.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    return profiles;
  }

  public async findUserByProfileId(profileId: string) {
    return this.databaseService.profile.findUnique({
      where: { id: profileId },
    });
  }
}
