import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ErrorCustom, ErrorType } from 'src/errors/ErrorCustom';
import { BaseWsException } from 'src/errors/WsError';

@Catch()
export class WebSocketExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger();
  private readonly configService = new ConfigService();

  constructor() {
    super();
  }

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToWs();
    const client = ctx.getClient<Socket>();
    const event = ctx.getData()?.event;
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    try {
      const error = this.normalizeError(exception, client, isProduction, event);
      this.formatErrorLog(error, client, isProduction, event);

      console.log('Emitting error to client...');
      client.emit('error', error.toJSON(isProduction));
      console.log('Error emitted successfully');
    } catch (unexpectedError) {
      const fallbackError = new ErrorCustom(
        'An unexpected error occurred',
        false,
        {
          statusCode: 500,
          errorType: ErrorType.INTERNAL,
          details: {
            code: 'UNEXPECTED_ERROR',
            metadata: {
              originalError: unexpectedError.message,
            },
          },
        }
      );
      this.formatErrorLog(fallbackError, client, event);

      client.emit('error', fallbackError.toJSON(isProduction));
    }

    super.catch(exception, host);
  }

  private normalizeError(
    exception: any,
    client: Socket,
    isProduction: boolean,
    event?: string
  ): ErrorCustom {
    const path = `socket:${client.nsp.name}${event ? `/${event}` : ''}`;

    if (exception instanceof BaseWsException) {
      return ErrorCustom.fromNestError(exception);
    }

    if (exception.message?.includes('connect() already called')) {
      return ErrorCustom.MediaError('Transport connection error', {
        code: 'TRANSPORT_ALREADY_CONNECTED',
        metadata: {
          transportId: client.data?.transportId,
          event,
          socketId: client.id,
        },
      });
    }

    if (exception.message?.includes('Transport closed')) {
      return ErrorCustom.SocketError('Connection lost', {
        code: 'TRANSPORT_CLOSED',
        metadata: {
          socketId: client.id,
          event,
          namespace: client.nsp.name,
        },
      });
    }

    if (exception.name === 'ValidationError') {
      return ErrorCustom.ValidationError(exception.message, {
        code: 'VALIDATION_FAILED',
        field: exception.property,
        metadata: {
          constraints: exception.constraints,
          value: exception.value,
        },
      });
    }

    if (exception.name === 'PrismaClientKnownRequestError') {
      return ErrorCustom.DatabaseError('Database operation failed', {
        code: exception.code,
        metadata: {
          target: exception.meta?.target,
          details: exception.meta,
        },
      });
    }
    return new ErrorCustom(
      isProduction ? 'Internal server error' : exception.message,
      false,
      {
        statusCode: 500,
        errorType: ErrorType.INTERNAL,
        path,
        details: {
          code: 'INTERNAL_ERROR',
          metadata: {
            name: exception.name,
            type: exception.type,
            event,
          },
        },
      }
    );
  }

  private formatErrorLog(
    error: ErrorCustom,
    client: Socket,
    isProduction: boolean,
    event?: string
  ) {
    const errorLog = [
      '\n',
      '╔════════════════════════ WebSocket Error Log ════════════════════════',
      `║ Timestamp: ${new Date().toISOString()}`,
      `║ Error Type: ${error.errorType}`,
      `║ Status Code: ${error.statusCode}`,
      `║ Message: ${error.message}`,
      `║ Correlation ID: ${error.correlationId}`,
      '╟────────────────────────── Socket Info ───────────────────────────',
      `║ Socket ID: ${client.id}`,
      `║ Namespace: ${client.nsp.name}`,
      `║ Event: ${event || 'N/A'}`,
      `║ User ID: ${client.data?.userId || 'N/A'}`,
      `║ Room: ${Array.from(client.rooms).join(', ') || 'N/A'}`,
      '╟────────────────────────── Connection Info ────────────────────────',
      `║ IP: ${client.handshake.headers['x-forwarded-for'] || client.handshake.headers['x-real-ip'] || 'N/A'}`,
      `║ User Agent: ${client.handshake.headers['user-agent'] || 'N/A'}`,
      '║ Headers:',
      ...this.formatJSONLines(this.sanitizeHeaders(client.handshake.headers)),
      '║ Query Params:',
      ...this.formatJSONLines(client.handshake.query),
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
        ...error.stack.split('\n').map((line) => `║ ${line.trim()}`)
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
}
