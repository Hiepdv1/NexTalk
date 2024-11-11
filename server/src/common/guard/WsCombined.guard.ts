import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsClerkAuthGuard } from './auth/WsClerkAuth.guard';
import { WsSignatureGuard } from './Signature/WsSignature.guard';

@Injectable()
export class WsCombinedGuard implements CanActivate {
  constructor(
    private readonly clerkAuthGuard: WsClerkAuthGuard,
    private readonly requestSignature: WsSignatureGuard,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const [isAuth, isValidSignature] = await Promise.all([
      this.clerkAuthGuard.canActivate(context),
      this.requestSignature.canActivate(context),
    ]);

    if (!isValidSignature) {
      return false;
    }

    return isAuth;
  }
}
