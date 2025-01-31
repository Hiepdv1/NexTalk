import { ConfigService } from '@nestjs/config';
import { BullRootModuleOptions } from '@nestjs/bullmq';

export const BullConfig = (
  configService: ConfigService
): BullRootModuleOptions => ({
  connection: {
    url: configService.get<string>('REDIS_URL'),
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 10,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});
