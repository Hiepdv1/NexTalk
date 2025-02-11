import { RegisterQueueAsyncOptions } from '@nestjs/bullmq';

export const queues: RegisterQueueAsyncOptions[] = [
  {
    name: 'ChannelMessage',
  },
  {
    name: 'DirectMessage',
  },
  {
    name: 'ChannelRead',
  },
  {
    name: 'ConversationRead',
  },
];
