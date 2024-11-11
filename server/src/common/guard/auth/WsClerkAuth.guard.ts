import { clerkClient } from '@clerk/clerk-sdk-node';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class WsClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const socket = context.switchToWs().getClient<Socket>();
    try {
      const data = context.switchToWs().getData();

      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.['authorization']?.split('Bearer ')[1] ||
        data?.authorization?.split('Bearer ')[1];

      const decoded = await clerkClient.verifyToken(token);

      socket.userId = decoded.sub;

      return true;
    } catch {
      socket.emit('error', {
        message: 'Unauthorized access. Token verification failed.',
      });

      return false;
    }
  }
}
