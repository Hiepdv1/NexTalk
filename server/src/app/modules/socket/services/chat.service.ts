import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Socket } from 'socket.io';
import { ProfileCacheService } from '../../auth/services/profileCache.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly profileCacheService: ProfileCacheService
  ) {}

  async handleConnection(socket: Socket) {
    const clientId = socket.id;
    const prefix = `chat/${clientId}`;
    console.log('---------------------------------', socket.userId);
    await this.cacheManager.set(prefix, socket.userId, 0);

    socket.on('disconnect', async () => {
      const userId = (await this.cacheManager.get(prefix)) as string;

      if (userId) {
        await Promise.all([
          this.profileCacheService.deleteProfileCache(userId),
          this.profileCacheService.deleteUserJoinedServersCache(userId),
        ]);
        console.log('Cache deleted successfully');
      }
    });
  }
}
