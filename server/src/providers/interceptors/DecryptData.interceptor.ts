import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { AppHelperService } from 'src/common/helpers/app.helper';
import { Socket } from 'socket.io';

@Injectable()
export class DecryptDataInterceptor implements NestInterceptor {
  private readonly fields: string[];
  private readonly secretKey: string;

  constructor(fields?: string[]) {
    this.fields = fields || [];
    this.secretKey = new ConfigService().get<string>('HASH_MESSAGE_SECRET_KEY');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToWs();
    const socket = context.switchToWs().getClient<Socket>();
    const data = ctx.getData();

    try {
      if (this.fields.length === 0) {
        const decryptedData = AppHelperService.decrypt(data, this.secretKey);
        socket.data.decrypted = JSON.parse(decryptedData);
      } else {
        const values = { ...data };
        this.fields.forEach((field) => {
          if (values[field]) {
            values[field] = JSON.parse(
              AppHelperService.decrypt(values[field], this.secretKey)
            );
          }
        });
        socket.data.decrypted = values;
      }
    } catch {
      throw new BadRequestException('Invalid data');
    }

    return next.handle().pipe(map((value) => value));
  }
}
