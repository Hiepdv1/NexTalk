import { Module } from '@nestjs/common';
import { BullModule as NestBullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullConfig } from './configs/bull.config';
import { Processors } from './processors';
import { queues } from './queues';
import { PostgresDatabaseProviderModule } from '@src/providers/database/postgres/provider.module';

@Module({
  imports: [
    PostgresDatabaseProviderModule,
    NestBullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => BullConfig(configService),
      inject: [ConfigService],
    }),
    ...queues.map((queue) =>
      NestBullModule.registerQueueAsync({
        ...queue,
      })
    ),
  ],
  providers: [...Processors],
  exports: [NestBullModule, ...Processors],
})
export class BullModule {}
