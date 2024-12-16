import { Injectable } from '@nestjs/common';
import { RedisCacheService } from 'src/providers/cache/redis.cache';
import { ConversationWithRelations } from '../entities/conversation.entity';

@Injectable()
export class ConversationCacheService {
  private ttl: number = 3600 * 24; /// 1 days;

  constructor(private readonly cacheManager: RedisCacheService) {}

  private getConversationKey({ serverId }: { serverId: string }) {
    return `SERVER:${serverId}:CONVERSATIONS`;
  }

  public async setAndOverrideConversationCache(
    {
      serverId,
    }: {
      serverId: string;
    },
    data: ConversationWithRelations[]
  ) {
    const keyCache = this.getConversationKey({ serverId });
    await this.cacheManager.setCache(keyCache, data, this.ttl);
  }

  public async getConversationCache(key: { serverId: string }) {
    const keyCache = this.getConversationKey(key);

    const conversations = (await this.cacheManager.getCache(
      keyCache
    )) as ConversationWithRelations[];

    if (!conversations) {
      return [];
    }

    return conversations;
  }
}
