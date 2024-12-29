import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { ErrorCustom } from 'src/errors/ErrorCustom';

@Catch()
export class HttpExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(HttpExceptionsFilter.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async catch(exception: any, host: ArgumentsHost) {
    super.catch(exception, host);

    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    try {
      const error = this.normalizeError(exception, req);
      this.logFormattedError(error, req, isProduction);

      return res.status(error.statusCode).json(error.toJSON(isProduction));
    } catch (unexpectedError) {
      const fallbackError = ErrorCustom.InternalError(
        'An unexpected error occurred',
        {
          code: 'ERROR_HANDLER_FAILURE',
          metadata: {
            originalError: unexpectedError.message,
            timestamp: new Date().toISOString(),
          },
        }
      );

      this.logFormattedError(fallbackError, req, isProduction);
      return res.status(500).json(fallbackError.toJSON(isProduction));
    }
  }

  private normalizeError(exception: any, req: Request): ErrorCustom {
    const path = `${req.method}:${req.path}`;
    const userId = (req as any).user?.id;

    if (exception instanceof ErrorCustom) {
      return exception;
    }

    if (exception instanceof HttpException) {
      return ErrorCustom.fromNestError(exception, path);
    }

    if (exception.code?.startsWith('P')) {
      return ErrorCustom.DatabaseError('Database operation failed', {
        code: exception.code,
        metadata: {
          target: exception.meta?.target,
          details: exception.meta,
          userId,
          path,
          operation: exception.meta?.modelName,
        },
      });
    }

    if (exception.name === 'JsonWebTokenError') {
      return ErrorCustom.UnauthorizedError('Invalid authentication token', {
        code: 'INVALID_TOKEN',
        metadata: {
          tokenError: exception.message,
          userId,
          path,
        },
      });
    }

    return ErrorCustom.InternalError(
      this.configService.get<string>('NODE_ENV') === 'production'
        ? 'Internal server error'
        : exception.message,
      {
        code: 'INTERNAL_ERROR',
        metadata: {
          name: exception.name,
          type: exception.type,
          userId,
          path,
        },
      }
    );
  }

  private logFormattedError(
    error: ErrorCustom,
    req: Request,
    isProduction = false
  ): void {
    const errorLog = [
      '',
      '╔════════════════════════ HTTP Error Log ════════════════════════',
      `║ Timestamp: ${new Date().toISOString()}`,
      `║ Error Type: ${error.errorType}`,
      `║ Status Code: ${error.statusCode}`,
      `║ Message: ${error.message}`,
      `║ Correlation ID: ${error.correlationId}`,
      '╟────────────────────────── Request Info ───────────────────────────',
      `║ Method: ${req.method}`,
      `║ URL: ${req.url}`,
      `║ Path: ${req.path}`,
      `║ User ID: ${(req as any).user?.id || 'N/A'}`,
      '╟────────────────────────── Request Details ────────────────────────',
      `║ IP: ${req.ip || req.headers['x-forwarded-for'] || 'N/A'}`,
      `║ User Agent: ${req.headers['user-agent'] || 'N/A'}`,
      '║ Headers:',
      ...this.formatJSONLines(this.sanitizeHeaders(req.headers)),
      '║ Query:',
      ...this.formatJSONLines(req.query),
      '║ Body:',
      ...this.formatJSONLines(this.sanitizeBody(req.body)),
      '╟────────────────────────── Error Details ──────────────────────────',
      `║ Code: ${error.details?.code || 'N/A'}`,
      `║ Field: ${error.details?.field || 'N/A'}`,
      `║ Path: ${error.path || 'N/A'}`,
      `║ Status: ${error.status}`,
      '╟────────────────────────── Metadata ───────────────────────────────',
      ...this.formatJSONLines(error.details?.metadata || {}),
    ];

    if (!isProduction && error.stack) {
      errorLog.push(
        '╟────────────────────────── Stack Trace ────────────────────────────',
        ...error.stack.split('\n').map((line) => `║ ${line}`)
      );
    }

    errorLog.push(
      '╚════════════════════════════════════════════════════════════════════'
    );

    const formattedLog = errorLog.join('\n');

    if (error.isOperationError) {
      this.logger.debug(formattedLog);
    } else {
      this.logger.error(formattedLog);
    }
  }

  private formatJSONLines(obj: any): string[] {
    if (!obj || Object.keys(obj).length === 0) {
      return ['║   N/A'];
    }

    const jsonString = JSON.stringify(obj, null, 2);
    return jsonString.split('\n').map((line) => `║   ${line}`);
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-auth-token'];
    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    return sanitized;
  }
}
