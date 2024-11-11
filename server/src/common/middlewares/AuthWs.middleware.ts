import { Injectable, UnauthorizedException } from '@nestjs/common';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { Socket } from 'socket.io';

@Injectable()
export class AuthWsMiddleware {
  async use(socket: Socket, next: (err?: any) => any) {
    try {
      let token = (socket.handshake.auth.authorization ||
        socket.handshake.headers.authorization) as string;

      token = token.split('Bearer ')[1];

      const decoded = await clerkClient.verifyToken(token);

      socket.userId = decoded.sub;

      next();
    } catch {
      next(new UnauthorizedException('Unauthorized'));
    }
  }
}
