import { Socket } from 'socket.io';
import { ProfileCacheService } from '../../auth/services/profileCache.service';
import { Injectable, Logger } from '@nestjs/common';
import { ServerCacheService } from '../../server/services/serverCache.service';

@Injectable()
export class SocketService {
  private readonly logger = new Logger();
  public USERS_ONLINE = new Map<string, string>();

  constructor(
    private readonly profileCacheService: ProfileCacheService,
    private readonly serverCacheService: ServerCacheService
  ) {}

  async handleConnection(socket: Socket) {
    console.log(
      '--------------------------------- Socket connected with userId: ',
      socket.userId
    );

    console.log(
      '--------------------------------- Socket connected with socketId: ',
      socket.id
    );

    if (!this.USERS_ONLINE.has(socket.id)) {
      this.USERS_ONLINE.set(socket.id, socket.userId);
    }

    socket.on('disconnect', async () => {
      await this.profileCacheService.delProfileCache(socket.userId);
      this.USERS_ONLINE.delete(socket.id);
    });
  }
}
