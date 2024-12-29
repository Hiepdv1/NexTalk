import { HttpStatus } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

export class BaseWsException extends WsException {
  public name: string;
  public status: number;
  public cause: unknown;

  constructor(message: string, name: string, status: number, cause?: unknown) {
    super(message);
    this.name = name;
    this.status = status;
    this.cause = cause || null;

    Error.captureStackTrace(this, this.constructor);
  }

  getResponse(): string | object {
    return { message: this.message, cause: this.cause };
  }

  getStatus(): number {
    return this.status;
  }

  initCause(cause: unknown): void {
    this.cause = cause;
  }
}

export class WsBadRequestException extends BaseWsException {
  constructor(message: string) {
    super(message, 'BAD_REQUEST', HttpStatus.BAD_REQUEST);
  }

  getResponse(): string | object {
    return {
      message: this.message,
      errorType: 'BAD_REQUEST',
      cause: this.cause,
    };
  }
}

export class WsNotFoundException extends BaseWsException {
  constructor(message: string) {
    super(message, 'NOT_FOUND', HttpStatus.NOT_FOUND);
  }

  getResponse(): string | object {
    return {
      message: this.message,
      errorType: 'NOT_FOUND',
      cause: this.cause,
    };
  }
}

export class WsUnauthorizedException extends BaseWsException {
  constructor(message: string) {
    super(message, 'UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
  }

  getResponse(): string | object {
    return {
      message: this.message,
      errorType: 'UNAUTHORIZED',
      cause: this.cause,
    };
  }
}

export class WsForbiddenException extends BaseWsException {
  constructor(message: string) {
    super(message, 'FORBIDDEN', HttpStatus.FORBIDDEN);
  }

  getResponse(): string | object {
    return {
      message: this.message,
      errorType: 'FORBIDDEN',
      cause: this.cause,
    };
  }
}

export class WsConflictException extends BaseWsException {
  constructor(message: string) {
    super(message, 'CONFLICT', HttpStatus.CONFLICT);
  }

  getResponse(): string | object {
    return {
      message: this.message,
      errorType: 'CONFLICT',
      cause: this.cause,
    };
  }
}

export class WsInternalServerErrorException extends BaseWsException {
  constructor(message: string) {
    super(message, 'INTERNAL_SERVER_ERROR', HttpStatus.INTERNAL_SERVER_ERROR);
  }

  getResponse(): string | object {
    return {
      message: this.message,
      errorType: 'INTERNAL_SERVER_ERROR',
      cause: this.cause,
    };
  }
}
