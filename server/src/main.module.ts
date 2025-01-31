import { Module } from '@nestjs/common';
import { PostgresDatabaseProviderModule } from './providers/database/postgres/provider.module';
import { PostgresDatabaseProviderService } from './providers/database/postgres/provider.service';
import { ConfigModule } from '@nestjs/config';
import { validate } from './common/pipes/env.validation';
import { MainController } from './Main.controller';
import { AppModule } from './app/app.module';
import { NestCloudinaryClientModule } from './configs/storage/cloudianry/cloudinary.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),

    ScheduleModule.forRoot(),
    PostgresDatabaseProviderModule,
    NestCloudinaryClientModule,
    AppModule,
  ],
  controllers: [MainController],
  providers: [PostgresDatabaseProviderService],
})
export class MainModule {}
