import { Module } from '@nestjs/common';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';
import { RequestNonceService } from './services/requestNonce.service';

@Module({
  providers: [RequestNonceService, PostgresDatabaseProviderService],
  exports: [RequestNonceService],
})
export class RequestNonceModule {}
