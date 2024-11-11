import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: PostgresDatabaseProviderService
  ) {}

  async createProfile(data: Prisma.ProfileCreateInput) {
    return this.databaseService.profile.create({ data });
  }

  async findUserById(userId?: string) {
    return this.databaseService.profile.findUnique({
      where: { userId },
    });
  }

  async findUserByProfileId(profileId: string) {
    return this.databaseService.profile.findUnique({
      where: { id: profileId },
    });
  }
}
