import { Module } from '@nestjs/common';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';
import { ClientService } from './services/client.service';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [PostgresDatabaseProviderService, ClientService, ConfigService],
  exports: [ClientService],
})
export class ServerModule {}
