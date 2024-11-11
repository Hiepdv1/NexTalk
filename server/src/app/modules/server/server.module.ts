import { Module } from '@nestjs/common';
import { ServerController } from './controllers/server.controller';
import { ServerService } from './services/server.service';
import { CloudinaryService } from 'src/configs/storage/cloudianry/cloudinary.service';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';
import { AuthService } from '../auth/services/auth.service';
import { ProfileCacheService } from '../auth/services/profileCache.service';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [SocketModule],
  controllers: [ServerController],
  providers: [
    PostgresDatabaseProviderService,
    ServerService,
    AuthService,
    CloudinaryService,
    ProfileCacheService,
  ],
})
export class ServerModule {}
