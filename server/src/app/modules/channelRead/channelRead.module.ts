import { Module } from '@nestjs/common';
import { PostgresDatabaseProviderModule } from '@src/providers/database/postgres/provider.module';
import { ChannelReadService } from './services/channelRead.service';
import { ChannlReadController } from './controllers/channelRead.controller';
import { AuthService } from '../auth/services/auth.service';

@Module({
  imports: [PostgresDatabaseProviderModule],
  controllers: [ChannlReadController],
  providers: [ChannelReadService, AuthService],
  exports: [ChannelReadService],
})
export class ChannelReadModule {}
