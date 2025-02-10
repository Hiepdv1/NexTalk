import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueEvents } from 'bullmq';
import { BullConfig } from '../configs/bull.config';

export const ChannelReadQueueEventsProvider: Provider = {
  provide: 'CHANNEL_READ_QUEUE_EVENTS',
  useFactory: (configService: ConfigService) => {
    const bullOptions = BullConfig(configService);
    return new QueueEvents('ChannelRead', {
      connection: bullOptions.connection,
    });
  },
  inject: [ConfigService],
};

export default [ChannelReadQueueEventsProvider];
