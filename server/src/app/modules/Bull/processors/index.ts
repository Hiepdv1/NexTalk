import { ChannelMessageProcessor } from './channel-message.processor';
import { ChannelReadProcessor } from './channel-message.processor copy';
import { DirectMessageProcessor } from './direct-message.processor';

export const Processors = [
  ChannelMessageProcessor,
  DirectMessageProcessor,
  ChannelReadProcessor,
];
