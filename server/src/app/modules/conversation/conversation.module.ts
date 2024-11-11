import { Module } from '@nestjs/common';
import { ConversationController } from './controllers/conversation.controller';
import { ConversationService } from './services/conversation.service';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';
import { AuthService } from '../auth/services/auth.service';
import { MemberService } from '../members/services/member.service';

@Module({
  controllers: [ConversationController],
  providers: [
    AuthService,
    MemberService,
    ConversationService,
    PostgresDatabaseProviderService,
  ],
})
export class ConversationModule {}
