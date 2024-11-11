import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { ServerWithRelations } from '../entities/auth.entity';
import { Profile } from '@prisma/client';

@Injectable()
export class ProfileCacheService {
  private ttl: number;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    this.ttl =
      Number.parseInt(configService.get<string>('CACHE_ASIDE_TTL')) || 3600000; // 1 hour by miliseconds
  }

  private getProfileKey(profileId: string) {
    return `PROFILE:${profileId}`;
  }

  private getProfileServersKey(profileId: string) {
    return `${this.getProfileKey(profileId)}:SERVERS`;
  }

  public async getUserJoinedServers(
    profileId: string
  ): Promise<ServerWithRelations[] | null> {
    const cacheKey = this.getProfileServersKey(profileId);
    console.log(cacheKey);
    const cacheData = (await this.cacheManager.get(cacheKey)) as any;

    if (cacheData) {
      return JSON.parse(cacheData);
    }

    return null;
  }

  public async getProfileCache(profileId: string): Promise<Profile | null> {
    const cacheKey = this.getProfileKey(profileId);
    const cacheData = (await this.cacheManager.get(cacheKey)) as any;

    if (cacheData) {
      return JSON.parse(cacheData);
    }

    return null;
  }

  public async setProfileCache(profileId: string, data: Profile) {
    const cacheKey = this.getProfileKey(profileId);
    console.log('SET: ', cacheKey);
    await this.cacheManager.set(cacheKey, JSON.stringify(data), 0);
  }

  public async deleteProfileCache(profileId: string) {
    const cacheKey = this.getProfileKey(profileId);
    await this.cacheManager.del(cacheKey);
  }

  public async setUserJoinedServersCache(
    profileId: string,
    data: ServerWithRelations[]
  ) {
    const cacheKey = this.getProfileServersKey(profileId);
    console.log('SET: ', cacheKey);

    await this.cacheManager.set(cacheKey, JSON.stringify(data), 0);
  }

  public async deleteUserJoinedServersCache(profileId: string) {
    const cacheKey = this.getProfileServersKey(profileId);
    await this.cacheManager.del(cacheKey);
  }
}
