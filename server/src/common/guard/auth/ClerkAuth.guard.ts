import { clerkClient } from '@clerk/clerk-sdk-node';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
// import { Observable } from 'rxjs';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    try {
      const ctx = context.switchToHttp();
      const req = ctx.getRequest<Request>();

      const token = req.cookies.__session || req.headers['authorization'];

      const decoded = await clerkClient.verifyToken(token);

      req.userId = decoded.sub;

      return true;
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }
}
