import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { AppHelperService } from 'src/common/helpers/app.helper';

@Injectable()
export class RedisCacheService implements OnModuleInit {
  private readonly logger = new Logger();

  private readonly ttl: number = 0;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async onModuleInit() {
    await this.cacheManager.reset();
    this.logger.debug('Redis cache cleared');
  }

  public async setCache(key: string, data: any, time?: number) {
    try {
      const encodeData = AppHelperService.encodeWithMsgPack(data);

      await this.cacheManager.set(key, encodeData, time || this.ttl);
      this.logger.debug(`Data set in cache with key: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting cache with key: ${key}`, error.stack);
    }
  }

  public async setCacheNotEncode(key: string, data: any, time?: number) {
    try {
      await this.cacheManager.set(key, data, time || this.ttl);
      this.logger.debug(`Data set in cache with key: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting cache with key: ${key}`, error.stack);
    }
  }

  public async getCacheNotDecode(key: string) {
    const cache = await this.cacheManager.get(key);
    if (!cache) {
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    }

    return cache;
  }

  public async getCache(key: string) {
    try {
      const cache = (await this.cacheManager.get(key)) as Buffer | null;

      if (!cache) {
        this.logger.debug(`Cache miss for key: ${key}`);
        return null;
      }

      const decodedData = AppHelperService.decodeWithMsgPack(cache);
      this.logger.debug(`Cache hit for key: ${key}`);
      return decodedData;
    } catch (error) {
      this.logger.error(`Error getting cache for key: ${key}`, error.stack);
      return null;
    }
  }

  public async delCache(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache for key: ${key}`, error.stack);
    }
  }
}
