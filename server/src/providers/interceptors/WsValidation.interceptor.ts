import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Socket } from 'socket.io';
import { WsBadRequestException } from 'src/errors/WsError';

@Injectable()
export class WsValidationInterceptor<T> implements NestInterceptor {
  constructor(private readonly dto: new () => T) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const socket: Socket = context.switchToWs().getClient();

    console.log('Dto: ', this.dto);

    const message = socket.data?.decrypted?.message;

    if (!message) {
      throw new WsBadRequestException('Invalid Data');
    }

    const dtoInstance: any = plainToInstance(this.dto, message, {
      enableImplicitConversion: true,
      exposeDefaultValues: true,
    });

    const errors = await validate(dtoInstance);
    if (errors.length > 0) {
      const errorMessages = errors.map((error) => {
        const constraints = Object.values(error.constraints || {}).join(', ');
        return `${error.property}: ${constraints}`;
      });
      console.log('Message decrypted: ', message);
      throw new WsBadRequestException(
        `${this.dto.name} - Validation failed: ${errorMessages.join('; ')}`
      );
    }

    socket.data.validatedMessage = dtoInstance;
    socket.data.decrypted.message = null;

    return next.handle().pipe(
      tap(() => {
        const socket: Socket = context.switchToWs().getClient();
        socket.data.validatedMessage = null;
        socket.data.decrypted.message = null;
      })
    );
  }
}
