import { Module } from '@nestjs/common';
import { SeederService } from './services/Seeder.service';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [SeederService, PostgresDatabaseProviderService, ConfigService],
})
export class SeederModule {}
