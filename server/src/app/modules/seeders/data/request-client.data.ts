import { RequestClient } from 'src/common/interfaces/nonce.interface';
import { randomBytes } from 'crypto';
import { AppHelperService } from '../../../../common/helpers/app.helper';

export const RequestClientData: RequestClient[] = [
  {
    clientName: AppHelperService.generateUUID(),
    clientId: AppHelperService.generateUUID(),
    clientKey: randomBytes(32).toString('hex'),
  },
];
