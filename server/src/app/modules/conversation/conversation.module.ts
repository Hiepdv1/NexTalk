import { Module } from '@nestjs/common';
import { ConversationController } from './controllers/conversation.controller';
import { ConversationService } from './services/conversation.service';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';
import { AuthService } from '../auth/services/auth.service';
import { ConversationCacheService } from './services/conversationCache.service';
import { RedisCacheService } from 'src/providers/cache/redis.cache';
import { NestCloudinaryClientModule } from '@src/configs/storage/cloudianry/cloudinary.module';
import { NestDropboxModule } from '@src/configs/storage/dropbox/dropbox.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [NestCloudinaryClientModule, NestDropboxModule, SocketModule],
  controllers: [ConversationController],
  providers: [
    AuthService,
    ConversationService,
    PostgresDatabaseProviderService,
    ConversationCacheService,
    RedisCacheService,
  ],
})
export class ConversationModule {}
