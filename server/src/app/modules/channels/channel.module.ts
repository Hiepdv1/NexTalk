import { Module } from '@nestjs/common';
import { ChannelController } from './controllers/channel.controller';
import { ChannelService } from './services/channel.service';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';
import { AuthService } from '../auth/services/auth.service';
import { ServerService } from '../server/services/server.service';
import { DropboxService } from 'src/configs/storage/dropbox/dropbox.service';
import { MessageService } from '../socket/services/message.service';
import { ChannelCacheService } from './services/channelCache.service';
import { ProfileCacheService } from '../auth/services/profileCache.service';
import { CloudinaryService } from 'src/configs/storage/cloudianry/cloudinary.service';
import { SocketModule } from '../socket/socket.module';
@Module({
  imports: [SocketModule],
  controllers: [ChannelController],
  providers: [
    PostgresDatabaseProviderService,
    AuthService,
    ChannelService,
    ServerService,
    DropboxService,
    MessageService,
    ChannelCacheService,
    ProfileCacheService,
    CloudinaryService,
  ],
})
export class ChannelModule {}
