import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';

@Injectable()
export class ServerCacheService {
  private ttl: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cachesManager: Cache,
    private readonly configService: ConfigService
  ) {
    this.ttl =
      Number.parseInt(configService.get<string>('CACHE_ASIDE_TTL')) || 3600000; // 1 hour by miliseconds
  }

  private getProfileKey(profileId: string) {
    return `PROFILE:${profileId}`;
  }
}
