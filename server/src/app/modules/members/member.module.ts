import { Module } from '@nestjs/common';
import { MemberService } from './services/member.service';
import { PostgresDatabaseProviderModule } from '@src/providers/database/postgres/provider.module';

@Module({
  imports: [PostgresDatabaseProviderModule],
  controllers: [],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
