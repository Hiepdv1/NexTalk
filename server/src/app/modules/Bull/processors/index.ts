import { ChannelMessageProcessor } from './channel-message.processor';
import { ChannelReadProcessor } from './channel-read.processor';
import { ConversationReadProcessor } from './conversation-read.processor';
import { DirectMessageProcessor } from './direct-message.processor';

export const Processors = [
  ChannelMessageProcessor,
  DirectMessageProcessor,
  ChannelReadProcessor,
  ConversationReadProcessor,
];
