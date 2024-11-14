import { Module } from '@nestjs/common';
import { ServerController } from './controllers/server.controller';
import { ServerService } from './services/server.service';
import { CloudinaryService } from 'src/configs/storage/cloudianry/cloudinary.service';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';
import { AuthService } from '../auth/services/auth.service';
import { SocketModule } from '../socket/socket.module';
import { ProfileCacheService } from '../auth/services/profileCache.service';
import { ServerCacheService } from './services/serverCache.service';
import { RedisCacheService } from 'src/providers/cache/redis.cache';

@Module({
  imports: [SocketModule],
  controllers: [ServerController],
  providers: [
    PostgresDatabaseProviderService,
    ServerService,
    AuthService,
    CloudinaryService,
    ProfileCacheService,
    ServerCacheService,
    RedisCacheService,
  ],
  exports: [ServerCacheService, RedisCacheService],
})
export class ServerModule {}
