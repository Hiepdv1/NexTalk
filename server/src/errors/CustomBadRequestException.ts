import { BadRequestException } from '@nestjs/common';

export class CustomBadRequestException extends BadRequestException {
  public errorType: string | null;

  constructor(message: string, _errorType?: string) {
    super(message);
    this.errorType = _errorType || null;

    BadRequestException.captureStackTrace(this, this.constructor);
  }
}
