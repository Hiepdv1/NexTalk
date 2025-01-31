import { PipeTransform, Injectable } from '@nestjs/common';
import { WsBadRequestException } from '@src/errors/WsError';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppHelperService } from 'src/common/helpers/app.helper';

@Injectable()
export class DecryptAndValidatePipe<T> implements PipeTransform {
  constructor(
    private readonly dto: new () => T,
    private readonly field: string = 'message'
  ) {}

  async transform(value: any) {
    try {
      console.log('Values Message: ', value[this.field]);
      console.log('Values: ', value);
      const decrypted = AppHelperService.decrypt(
        value[this.field],
        process.env.HASH_MESSAGE_SECRET_KEY
      );
      const parsed = JSON.parse(decrypted);
      const dtoInstance: any = plainToInstance(this.dto, parsed, {
        enableImplicitConversion: true,
        exposeDefaultValues: true,
      });

      const errors = await validate(dtoInstance);
      if (errors.length > 0) {
        const errorMessages = errors.map((error) => {
          const constraints = Object.values(error.constraints || {}).join(', ');
          return `${error.property}: ${constraints}`;
        });
        throw new WsBadRequestException(
          `Validation failed: ${errorMessages.join('; ')}`
        );
      }

      return dtoInstance;
    } catch (err) {
      throw new WsBadRequestException('Invalid Data: ' + err.message);
    }
  }
}
