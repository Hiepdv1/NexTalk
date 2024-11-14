import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RedisCacheService } from 'src/providers/cache/redis.cache';
import { Prisma } from '@prisma/client';
import { AppHelperService } from 'src/common/helpers/app.helper';

@Injectable()
export class ProfileCacheService {
  constructor(
    private readonly authService: AuthService,
    private readonly redisCache: RedisCacheService
  ) {}

  private getProfileKey(userId: string) {
    return `PROFILE:${userId}`;
  }

  public async getProfile(
    userId: string
  ): Promise<Prisma.ProfileCountOrderByAggregateInput | null> {
    const keyCache = this.getProfileKey(userId);
    const profileCache = await this.redisCache.getCache(keyCache);

    if (!profileCache) return null;

    return AppHelperService.decodeWithMsgPack(profileCache);
  }

  public async setAndOverrideProfileCache(
    userId: string,
    data: Prisma.ProfileCountOrderByAggregateInput
  ) {
    const keyCache = this.getProfileKey(userId);
    const encodeData = AppHelperService.encodeWithMsgPack(data);
    await this.redisCache.setCache(keyCache, encodeData);
  }

  public async delProfileCache(userId: string) {
    const keyCache = this.getProfileKey(userId);
    await this.redisCache.delCache(keyCache);
  }
}
