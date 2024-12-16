import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketExceptionFilter } from './webSocket-exception.filter';
import { HttpExceptionsFilter } from './http-exceptions.filter';
import { WsException } from '@nestjs/websockets';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger();

  constructor(private readonly configService: ConfigService) {}

  async catch(exception: any, host: ArgumentsHost) {
    if (exception instanceof WsException) {
      const socketFilter = new WebSocketExceptionFilter(this.configService);
      await socketFilter.catch(exception, host);
    } else {
      const httpFilter = new HttpExceptionsFilter(this.configService);
      await httpFilter.catch(exception, host);
    }
  }
}
