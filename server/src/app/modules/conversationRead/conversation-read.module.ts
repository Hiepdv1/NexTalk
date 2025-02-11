import { Module } from '@nestjs/common';
import { PostgresDatabaseProviderModule } from '@src/providers/database/postgres/provider.module';
import { ConversationReadController } from './controllers/conversation-read.controller';
import { ConversationReadService } from './services/conversation-read.services';
import { MemberService } from '../members/services/member.service';

@Module({
  imports: [PostgresDatabaseProviderModule],
  controllers: [ConversationReadController],
  providers: [ConversationReadService, MemberService],
  exports: [ConversationReadService, MemberService],
})
export class ConversationReadModule {}
