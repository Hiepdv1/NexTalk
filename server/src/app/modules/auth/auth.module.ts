import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';
import { RedisCacheService } from 'src/providers/cache/redis.cache';

@Module({
  controllers: [AuthController],
  providers: [
    PostgresDatabaseProviderService,
    AuthService,
    RedisCacheService,
    RedisCacheService,
  ],
})
export class AuthModule {}
