import { messageQueries } from './mesage-queries';
import { messageMutations } from './message-mutations';

const messageExtensions = { ...messageQueries, ...messageMutations };

export default messageExtensions;
