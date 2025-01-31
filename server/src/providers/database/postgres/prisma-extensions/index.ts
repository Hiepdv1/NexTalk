import conversationExtensions from './conversation';
import directMessageExtensions from './directMessage';
import messageExtensions from './message';
import serverExtensions from './server';

const prismaExtensions = {
  query: {
    message: messageExtensions,
    server: serverExtensions,
    directMessage: directMessageExtensions,
    conversation: conversationExtensions,
  },
};

export default prismaExtensions;
