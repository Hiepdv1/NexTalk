import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';

@Module({
  controllers: [AuthController],
  providers: [PostgresDatabaseProviderService, AuthService],
})
export class AuthModule {}
