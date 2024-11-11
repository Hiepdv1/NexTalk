import { Module } from '@nestjs/common';
import { PostgresDatabaseProviderService } from './provider.service';
@Module({
  providers: [PostgresDatabaseProviderService],
  exports: [PostgresDatabaseProviderService],
})
export class PostgresDatabaseProviderModule {}
