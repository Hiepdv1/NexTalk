import { Socket } from 'socket.io';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCustom } from 'src/errors/ErrorCustom';

@Catch()
export class SocketExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger();

  constructor(private readonly configService: ConfigService) {}

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToWs();
    const clientSocket = ctx.getClient<Socket>();

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    const tranformError = this.TranformError(exception);

    if (isProduction) {
      this.ProdErrors(tranformError, clientSocket);
    } else {
      this.DevErrors(tranformError, clientSocket);
    }
  }

  private DevErrors(error: ErrorCustom, socket: Socket) {
    const errorLog = this.GetErrorLog(error, socket);
    const statusCode = error.statusCode;

    console.log('isOperationError: ', error.isOperationError);
    if (error.isOperationError) {
      this.logger.debug(errorLog);
    } else {
      this.logger.error(errorLog);
    }

    socket.emit('error', {
      ...error,
      statusCode,
    });
  }

  private ProdErrors(error: ErrorCustom, socket: Socket) {
    const errorLog = this.GetErrorLog(error, socket);
    const statusCode = error.statusCode;
    if (error.isOperationError) {
      this.logger.debug(errorLog);
    } else {
      this.logger.error(errorLog);
    }

    socket.emit('error', {
      statusCode,
      message: error.message,
      status: error.status,
      errorType: error.errorType,
    });
  }

  private GetErrorLog(error: ErrorCustom, socket: Socket): string {
    const errorLog = `
      ErrorType: ${error.errorType} \n
      Response Code: ${error.statusCode} - HEADERS: ${socket.client.request.headers} - URL: ${socket.client.request.url} \n
      ${error.stack}
      `;

    return errorLog;
  }

  private TranformError(error: any) {
    const message = error.message;
    const statusCode = error.status;
    const isOperationError = this.IsOperationalError(error);
    const errorCustom = new ErrorCustom(message, isOperationError, statusCode);
    errorCustom.stack = error.stack;

    return errorCustom;
  }

  private IsOperationalError(error: any) {
    if (error instanceof HttpException) {
      return true;
    }

    // Other errors can be handled by throwing them into a hash table .... exampple: Casting, ....

    return false;
  }
}
