import { Module } from '@nestjs/common';
import { ConversationController } from './controllers/conversation.controller';
import { ConversationService } from './services/conversation.service';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';
import { AuthService } from '../auth/services/auth.service';
import { MemberService } from '../members/services/member.service';
import { ConversationCacheService } from './services/conversationCache.service';
import { RedisCacheService } from 'src/providers/cache/redis.cache';

@Module({
  controllers: [ConversationController],
  providers: [
    AuthService,
    MemberService,
    ConversationService,
    PostgresDatabaseProviderService,
    ConversationCacheService,
    RedisCacheService,
  ],
})
export class ConversationModule {}
