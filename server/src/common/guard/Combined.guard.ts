import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ClerkAuthGuard } from './auth/ClerkAuth.guard';
import { RequestSignatureGuard } from './Signature/RequestSignature.guard';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from 'src/providers/decorators/public.decorator';

@Injectable()
export class CombinedGuard implements CanActivate {
  constructor(
    private readonly requestSignatureGuard: RequestSignatureGuard,
    private readonly clerkAuthGuard: ClerkAuthGuard,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      PUBLIC_KEY,
      context.getHandler()
    );
    if (isPublic) {
      return true;
    }

    const [isValidSignature, isAuth] = await Promise.all([
      this.requestSignatureGuard.canActivate(context),
      this.clerkAuthGuard.canActivate(context),
    ]);

    if (!isAuth) return false;

    return isValidSignature;
  }
}
