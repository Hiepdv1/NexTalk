import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { ErrorCustom } from 'src/errors/ErrorCustom';

@Catch()
export class HttpExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger();

  constructor(private readonly configService: ConfigService) {}

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    const tranformError = this.TranformError(exception);

    if (isProduction) {
      this.ProdErrors(tranformError, req, res);
    } else {
      this.DevErrors(tranformError, req, res);
    }
  }

  private DevErrors(error: ErrorCustom, req: Request, res: Response) {
    const errorLog = this.GetErrorLog(error, req);
    const statusCode = error.statusCode;

    console.log('isOperationError: ', error.isOperationError);
    if (error.isOperationError) {
      this.logger.debug(errorLog);
    } else {
      this.logger.error(errorLog);
    }

    res.status(statusCode).json({
      statusCode,
      message: error.message,
      stack: error.stack,
      errorType: error.errorType,
      error,
    });
  }

  private ProdErrors(error: ErrorCustom, req: Request, res: Response) {
    const errorLog = this.GetErrorLog(error, req);
    const statusCode = error.statusCode;
    if (error.isOperationError) {
      this.logger.debug(errorLog);
    } else {
      this.logger.error(errorLog);
    }

    res.status(statusCode).json({
      statusCode,
      message: error.message,
      status: error.status,
      errorType: error.errorType,
    });
  }

  private GetErrorLog(error: ErrorCustom, req: Request): string {
    const errorLog = `
    ErrorType: ${error.errorType} \n
    Response Code: ${error.statusCode} - Method: ${req.method} - URL: ${req.url} \n
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
