import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject, Logger } from '@nestjs/common';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger();

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async onModuleInit() {
    await this.cacheManager.reset();
    this.logger.debug('Redis cache cleared');
  }
}
