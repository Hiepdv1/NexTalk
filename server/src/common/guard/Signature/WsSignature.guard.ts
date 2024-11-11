import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';

import { ClientService } from 'src/app/modules/client/services/client.service';
import { RequestNonceService } from 'src/app/modules/requestNonce/services/requestNonce.service';
import { AppHelperService } from 'src/common/helpers/app.helper';
import { PUBLIC_KEY } from 'src/providers/decorators/public.decorator';
import { v4 as uuidValidate, V4Options } from 'uuid';

@Injectable()
export class WsSignatureGuard implements CanActivate {
  private clientKeyCache = new Map<string, string>();
  private readonly logger = new Logger();
  private readonly ttl = 60;

  constructor(
    private readonly clientService: ClientService,
    private readonly configService: ConfigService,
    private readonly requestNonceService: RequestNonceService,
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const data = context.switchToWs().getData();

      const isPublic = this.reflector.get<boolean>(
        PUBLIC_KEY,
        context.getHandler()
      );
      if (isPublic) return true;

      const { headers, body, method, message } = data;

      const clientId = headers?.['x-client-id'] as string;
      const nonce = headers?.['x-request-nonce'] as string;
      const signature = headers?.['x-signature'] as string;
      const timestamp = +headers?.['x-timestamp'];
      const requestId = headers?.['x-request-id'] as V4Options;
      const userAgent = headers?.['x-user-agent'];
      const socketUrl = headers?.['x-socket-url'];

      const headersParams = {
        clientId,
        nonce,
        signature,
        timestamp,
        requestId,
        userAgent,
        socketUrl,
      };

      const noncePattern = /^[a-zA-Z0-9]{64}$/;
      if (!noncePattern.test(nonce) || !uuidValidate(requestId)) {
        return false;
      }

      if (!this.isValidRequest({ headers: headersParams }, method))
        return false;

      const clientKey = await this.getClientKey(clientId);

      if (!clientKey) return false;

      const isValid = await this.isNonceDuplicate(nonce);

      if (isValid) return false;

      const isValidTimestamp = AppHelperService.isWithinMinutesAfter(
        timestamp,
        1
      );
      if (!isValidTimestamp) return false;

      const messageParam = `url:${socketUrl}|body:${message || body}|nonce:${nonce}|timestamp:${timestamp}|requestId:${requestId}|userAgent:${userAgent}`;

      if (!this.validateSignature(messageParam, signature, clientKey))
        return false;

      this.saveNonce(nonce).catch((err) => {
        this.logger.error(`Save nonce failed: ${err}`);
        throw err;
      });

      return true;
    } catch (error) {
      this.logger.error(`Error signing message: ${error}`);
      return false;
    }
  }

  private async isNonceDuplicate(nonce: string): Promise<boolean | undefined> {
    const exists = (await this.cacheManager.get(nonce)) as true | undefined;
    return exists;
  }

  private async saveNonce(nonce: string): Promise<void> {
    await this.cacheManager.set(nonce, true, this.ttl);
  }

  private async getClientKey(clientId: string): Promise<string | null> {
    let clientKey = this.clientKeyCache.get(clientId);
    if (!clientKey) {
      clientKey = await this.clientService.findOneByKey(clientId);
      if (clientKey) {
        this.clientKeyCache.set(clientId, clientKey);
      } else {
        return null;
      }
    }
    return clientKey;
  }

  private isValidRequest(data: any, method: string): boolean {
    const { signature, clientId, nonce, timestamp, requestId, userAgent } =
      data.headers;

    const validMethod = ['GET', 'POST'];

    if (
      !signature ||
      !clientId ||
      !nonce ||
      !timestamp ||
      !requestId ||
      !userAgent
    ) {
      return false;
    }

    if (!validMethod.includes(method)) return false;
    return true;
  }

  private validateSignature(
    message: string,
    signature: string,
    secret: string,
    algorithm: 'sha256' | 'sha512' = 'sha256'
  ): boolean {
    if (!['sha256', 'sha512'].includes(algorithm)) {
      this.logger.error('Invalid signature algorithm');
      return false;
    }

    const hmac = crypto
      .createHmac(algorithm, secret)
      .update(message)
      .digest('hex');

    console.log(`Generated HMAC: ${hmac}`);
    console.log('Provided signature: ', signature);
    console.log(`Is Invalid signature: ${hmac === signature}`);

    return hmac === signature;
  }
}
