import { Injectable } from '@nestjs/common';
import { RedisCacheService } from 'src/providers/cache/redis.cache';
import { ServerWithRelations } from '../../auth/entities/auth.entity';

@Injectable()
export class ServerCacheService {
  private ttl: number = 3600 * 24; /// 1 days;

  constructor(private readonly cacheManager: RedisCacheService) {}

  private getServerKey(serverId: string) {
    return `SERVER:${serverId}`;
  }

  public async setAndOverrideServerCache(
    serverId: string,
    data: ServerWithRelations
  ) {
    const keyCache = this.getServerKey(serverId);
    await this.cacheManager.setCache(keyCache, data, this.ttl);
  }

  public async getServerCache(serverId: string) {
    const keyCache = this.getServerKey(serverId);
    return (await this.cacheManager.getCache(keyCache)) as ServerWithRelations;
  }
}
