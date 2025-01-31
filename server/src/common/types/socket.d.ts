import 'socket.io';

declare module 'socket.io' {
  export interface Socket {
    userId?: string;
    data: {
      validatedMessage?: any;
      [key: string]: any;
    };
  }
}
