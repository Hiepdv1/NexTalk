import { IoAdapter } from '@nestjs/platform-socket.io';

export class SocketAdapter extends IoAdapter {
  createIOServer(port: number) {
    const server = super.createIOServer(port);

    return server;
  }
}
