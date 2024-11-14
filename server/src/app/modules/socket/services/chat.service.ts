import { Socket } from 'socket.io';
import { ProfileCacheService } from '../../auth/services/profileCache.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ChatService {
  private readonly logger = new Logger();

  constructor(private readonly profileCacheService: ProfileCacheService) {}

  async handleConnection(socket: Socket) {
    // const clientId = socket.id;
    console.log('---------------------------------', socket.userId);

    socket.on('disconnect', async () => {
      await this.profileCacheService.delProfileCache(socket.userId);
      console.log('Cache deleted successfully');
    });
  }
}
