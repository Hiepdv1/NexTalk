import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocketExceptionsFilter } from './socket-exception.filter';
import { HttpExceptionsFilter } from './http-exceptions.filter';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger();

  constructor(private readonly configService: ConfigService) {}

  async catch(exception: any, host: ArgumentsHost) {
    const contextType = host.getType();

    if (contextType === 'ws') {
      const socketFilter = new SocketExceptionsFilter(this.configService);
      await socketFilter.catch(exception, host);
    } else {
      const httpFilter = new HttpExceptionsFilter(this.configService);
      await httpFilter.catch(exception, host);
    }
  }
}
