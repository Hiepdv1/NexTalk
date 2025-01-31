import { directMessageMutations } from './directMessage-mutations';
import { directMesssageQueries } from './directMessage-queries';

const directMessageExtensions = {
  ...directMesssageQueries,
  ...directMessageMutations,
};

export default directMessageExtensions;
