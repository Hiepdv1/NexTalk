import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import {
  BaseWsException,
  WsBadRequestException,
  WsConflictException,
  WsForbiddenException,
  WsInternalServerErrorException,
  WsNotFoundException,
  WsUnauthorizedException,
} from './WsError';
import { WsException } from '@nestjs/websockets';

export enum ErrorType {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION = 'VALIDATION',
  MEDIA = 'MEDIA',
  SOCKET = 'SOCKET',
  DATABASE = 'DATABASE',
  INTERNAL = 'INTERNAL',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorStatus {
  FAILED = 'Failed',
  ERROR = 'Error',
  UNKNOWN = 'Unknown',
}

export interface ErrorMetadata {
  [key: string]: any;
  requestId?: string;
  userId?: string;
  timestamp?: string;
  source?: string;
}
export interface ValidationError {
  property: string;
  value?: any;
  constraints?: { [type: string]: string };
  children?: ValidationError[];
}

export interface ErrorOptions {
  statusCode?: number;
  errorType?: ErrorType;
  details?: ErrorDetails;
  path?: string;
  correlationId?: string;
  stack?: string;
}

interface ErrorDetails {
  field?: string;
  code?: string;
  metadata?: Record<string, any>;
  stack?: any;
}

export interface ErrorResponse {
  message: string;
  errorType: ErrorType;
  statusCode: number;
  status: ErrorStatus;
  timestamp: string;
  correlationId?: string;
  details?: ErrorDetails;
  path?: string;
  stack?: string;
}

export class ErrorCustom extends Error {
  public readonly statusCode: number;
  public readonly isOperationError: boolean;
  public readonly errorType: ErrorType;
  public readonly status: ErrorStatus;
  public readonly timestamp: string;
  public readonly details: ErrorDetails;
  public readonly path?: string;
  public readonly correlationId?: string;

  constructor(
    message: string,
    isOperationError: boolean,
    options?: ErrorOptions
  ) {
    super(message);

    const {
      statusCode = 500,
      errorType = ErrorType.INTERNAL,
      details = {},
      path,
      correlationId,
      stack,
    } = options || {};

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.status = this.getStatus(statusCode);
    this.isOperationError = isOperationError;
    this.timestamp = new Date().toISOString();
    this.details = this.normalizeDetails(details);
    this.path = path;
    this.correlationId = correlationId || this.generateCorrelationId();
    this.stack = stack;
  }

  private getStatus(statusCode: number): ErrorStatus {
    if (statusCode >= 500) return ErrorStatus.ERROR;
    if (statusCode >= 400) return ErrorStatus.FAILED;
    return ErrorStatus.UNKNOWN;
  }

  private generateCorrelationId(): string {
    return `err_${Date.now()}`;
  }

  public toJSON(isProduction = false): ErrorResponse {
    const baseError: ErrorResponse = {
      message: this.message,
      errorType: this.errorType,
      statusCode: this.statusCode,
      status: this.status,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
    };

    if (isProduction) {
      return {
        ...baseError,
        ...(this.details.code && { details: { code: this.details.code } }),
      };
    }

    return {
      ...baseError,
      details: this.details,
      path: this.path,
      stack: this.stack,
    };
  }

  private normalizeDetails(details: ErrorDetails): ErrorDetails {
    return {
      ...details,
      metadata: {
        ...details.metadata,
        timestamp: new Date().toISOString(),
      },
    };
  }

  public static fromNestError(
    error: HttpException | BaseWsException | WsException,
    path?: string
  ): ErrorCustom {
    let status = 500;
    let response: any = error;
    const type = error.message.toLowerCase();

    if (!(error instanceof WsException)) {
      response = error.getResponse();
      status = error.getStatus();
    }

    const message = response.message || error.message;
    const metadata: ErrorMetadata = {
      timestamp: new Date().toISOString(),
      source: 'NestJS',
      ...(typeof response === 'object' ? response : { response }),
    };

    let errorType = ErrorType.UNKNOWN;
    let isOperational = true;

    if (
      error instanceof BadRequestException ||
      error instanceof WsBadRequestException ||
      type.includes('bad request')
    ) {
      errorType = ErrorType.BAD_REQUEST;
      status = 400;
    } else if (
      error instanceof UnauthorizedException ||
      error instanceof WsUnauthorizedException ||
      type.includes('unauthorized')
    ) {
      errorType = ErrorType.UNAUTHORIZED;
      status = 401;
    } else if (
      error instanceof ForbiddenException ||
      error instanceof WsForbiddenException ||
      type.includes('forbidden')
    ) {
      errorType = ErrorType.FORBIDDEN;
      status = 403;
    } else if (
      error instanceof NotFoundException ||
      error instanceof WsNotFoundException
    ) {
      errorType = ErrorType.NOT_FOUND;
    } else if (
      error instanceof ConflictException ||
      error instanceof WsConflictException
    ) {
      errorType = ErrorType.CONFLICT;
    } else if (
      error instanceof InternalServerErrorException ||
      error instanceof WsInternalServerErrorException
    ) {
      errorType = ErrorType.INTERNAL;
      isOperational = false;
    }

    return new ErrorCustom(message, isOperational, {
      statusCode: status,
      errorType,
      path,
      details: {
        metadata,
        code: errorType,
        stack: error.stack,
      },
    });
  }

  public static UnauthorizedError(
    message = 'Unauthorized access',
    details?: ErrorDetails
  ): ErrorCustom {
    return new ErrorCustom(message, true, {
      statusCode: 401,
      errorType: ErrorType.UNAUTHORIZED,
      details: {
        ...details,
        code: details?.code || 'UNAUTHORIZED',
        metadata: {
          ...details?.metadata,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  public static ForbiddenError(
    message = 'Access forbidden',
    details?: ErrorDetails
  ): ErrorCustom {
    return new ErrorCustom(message, true, {
      statusCode: 403,
      errorType: ErrorType.FORBIDDEN,
      details: {
        ...details,
        code: details?.code || 'FORBIDDEN',
        metadata: {
          ...details?.metadata,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  public static InternalError(
    message = 'Internal server error',
    details?: ErrorDetails
  ): ErrorCustom {
    return new ErrorCustom(message, false, {
      statusCode: 500,
      errorType: ErrorType.INTERNAL,
      details: {
        ...details,
        code: details?.code || 'INTERNAL_ERROR',
        metadata: {
          ...details?.metadata,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  public static MediaError(
    message: string,
    details?: ErrorDetails
  ): ErrorCustom {
    return new ErrorCustom(message, false, {
      statusCode: 500,
      errorType: ErrorType.MEDIA,
      details: {
        ...details,
        metadata: {
          ...details?.metadata,
          source: 'MediaSoup',
        },
      },
    });
  }

  public static DatabaseError(
    message: string,
    details?: ErrorDetails
  ): ErrorCustom {
    return new ErrorCustom(message, false, {
      statusCode: 500,
      errorType: ErrorType.DATABASE,
      details: {
        ...details,
        metadata: {
          ...details?.metadata,
          source: 'Database',
        },
      },
    });
  }

  public static SocketError(
    message: string,
    details?: ErrorDetails
  ): ErrorCustom {
    return new ErrorCustom(message, true, {
      statusCode: 400,
      errorType: ErrorType.SOCKET,
      details: {
        ...details,
        metadata: {
          ...details?.metadata,
          source: 'Socket.IO',
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  public static ValidationError(
    message: string,
    details?: ErrorDetails
  ): ErrorCustom {
    return new ErrorCustom(message, true, {
      statusCode: 422,
      errorType: ErrorType.VALIDATION,
      details: {
        ...details,
        metadata: {
          ...details?.metadata,
          source: 'Validation',
          timestamp: new Date().toISOString(),
          validationErrors: details?.metadata?.constraints || [],
          field: details?.field,
          value: details?.metadata?.value,
        },
      },
    });
  }
}
