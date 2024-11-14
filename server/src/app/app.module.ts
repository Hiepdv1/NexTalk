import { Inject, MiddlewareConsumer, Module } from '@nestjs/common';
import { ServerModule } from './modules/server/Server.module';
import { AuthModule } from './modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RequestNonceService } from './modules/requestNonce/services/requestNonce.service';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';
import { ClientService } from './modules/client/services/client.service';
import { CombinedGuard } from 'src/common/guard/Combined.guard';
import { ClerkAuthGuard } from 'src/common/guard/auth/ClerkAuth.guard';
import { RequestSignatureGuard } from 'src/common/guard/Signature/RequestSignature.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { ChannelModule } from './modules/channels/channel.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import redisStore from 'cache-manager-redis-store';
import {
  CACHE_MANAGER,
  CacheModule,
  CacheModuleOptions,
} from '@nestjs/cache-manager';
import { SocketModule } from './modules/socket/socket.module';
import { NestDropboxModule } from 'src/configs/storage/dropbox/dropbox.module';
import { ServerCacheService } from './modules/server/services/serverCache.service';
import connectRedis from 'connect-redis';
import * as session from 'express-session';
import { RedisClient } from 'ioredis/built/connectors/SentinelConnector/types';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          store: redisStore,
          url: configService.get('REDIS_URL'),
          ttl: Number.parseInt(configService.get('REDIS_TTL')) || 600,
        } as unknown as CacheModuleOptions;
      },
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    ServerModule,
    ChannelModule,
    ConversationModule,
    SocketModule,
    NestDropboxModule,
  ],
  providers: [
    ConfigService,
    RequestNonceService,
    PostgresDatabaseProviderService,
    ClientService,
    ClerkAuthGuard,
    RequestSignatureGuard,
    ServerCacheService,
    {
      provide: APP_GUARD,
      useClass: CombinedGuard,
    },
  ],
})
export class AppModule {
  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private redis: RedisClient
  ) {}

  configure(consumer: MiddlewareConsumer) {
    const RedisStore = new connectRedis({
      client: this.redis,
    });

    consumer
      .apply(
        session({
          store: RedisStore,
          secret: this.configService.get<string>('SESSION_SECRET'),
          resave: false,
          saveUninitialized: false,
          cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 86400000,
          },
        })
      )
      .forRoutes('*');
  }
}
