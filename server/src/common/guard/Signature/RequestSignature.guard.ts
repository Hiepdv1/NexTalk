import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';
import { Request } from 'express';
import { ClientService } from 'src/app/modules/client/services/client.service';
import { RequestNonceService } from 'src/app/modules/requestNonce/services/requestNonce.service';
import { AppHelperService } from 'src/common/helpers/app.helper';
import { PUBLIC_KEY } from 'src/providers/decorators/public.decorator';
import { v4 as uuidValidate, V4Options } from 'uuid';

@Injectable()
export class RequestSignatureGuard implements CanActivate {
  constructor(
    private readonly clientService: ClientService,
    private readonly configService: ConfigService,
    private readonly requestNonceService: RequestNonceService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const isPublic = this.reflector.get<boolean>(
      PUBLIC_KEY,
      context.getHandler()
    );

    if (isPublic) return true;

    const siggBasedAuth = this.configService.get('SIGNATURE_BASED_AUTH');

    const signatureBasedAuth =
      await this.clientService.validateConfigValue(siggBasedAuth);

    if (!signatureBasedAuth) return false;

    const { headers, cookies } = request;

    const clientId = (headers['x-client-id'] ||
      cookies['x-client-id']) as string;
    const nonce = headers['x-request-nonce'] as string;
    const signature = headers['x-signature'] as string;
    const timestamp = +headers['x-timestamp'];
    const requestId = headers['x-request-id'] as V4Options;
    const userAgent = request.headers['user-agent'];
    const clientIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      request.ip;

    if (
      !signature ||
      !clientId ||
      !nonce ||
      !timestamp ||
      !requestId ||
      !userAgent ||
      !clientIp
    ) {
      return false;
    }

    const noncePattern = /^[a-zA-Z0-9]{64}$/;
    if (!noncePattern.test(nonce) || !uuidValidate(requestId)) {
      return false;
    }

    const nonceReq = nonce.toString();

    const isValidTimestamp = AppHelperService.isWithinMinutesAfter(
      timestamp,
      1
    ); // 1 minutes expiry

    if (!isValidTimestamp) return false;

    const prevReq = await this.requestNonceService.findOneByProps(nonceReq);

    if (prevReq) return false;

    await this.requestNonceService.create({
      nonce: nonceReq,
      requestMethod: request.method,
      requestUrl: request.originalUrl,
    });

    const message = JSON.stringify({
      url: request.originalUrl,
      body: request.body,
      nonce,
      clientIp,
      timestamp,
      requestId,
      userAgent,
    });

    console.log('-----------------------------------------------------');
    console.log('Received Nonce: ', nonce);
    console.log('Received Timestamp: ', timestamp);
    console.log('Received Signature: ', signature);
    console.log('Message: ', message);

    const clientKey = await this.clientService.findOneByKey(clientId);

    if (!clientKey) return false;

    console.log('Decrypt: ', clientKey);

    return this.validateSignature(message, signature, clientKey);
  }

  private validateSignature(
    message: string,
    signature: string,
    secret: string
  ): boolean {
    const hmac: string = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    console.log('Is Signature Valid: ', hmac === signature);
    console.log('Calculated HMAC: ', hmac);
    console.log('Provided Signature: ', signature);

    return hmac === signature;
  }
}
