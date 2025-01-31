import { Module } from '@nestjs/common';
import { PostgresDatabaseProviderModule } from '@src/providers/database/postgres/provider.module';
import { ChannelReadService } from './services/channelRead.service';

@Module({
  imports: [PostgresDatabaseProviderModule],
  providers: [ChannelReadService],
  exports: [ChannelReadService],
})
export class ChannelReadModule {}
