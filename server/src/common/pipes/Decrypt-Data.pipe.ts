import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { AppHelperService } from '../helpers/app.helper';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DecryptDataPipe implements PipeTransform {
  private readonly fields: string[];

  constructor(fields?: string[]) {
    this.fields = fields || [];
  }

  transform(values: any) {
    try {
      const secretKey = new ConfigService().get<string>(
        'HASH_MESSAGE_SECRET_KEY'
      );

      if (this.fields.length === 0) {
        const decryptedData = AppHelperService.decrypt(values, secretKey);
        console.log('Decrypted Data:', decryptedData);
        return JSON.parse(decryptedData);
      }

      const decryptedValues = { ...values };
      this.fields.forEach((field) => {
        if (decryptedValues[field]) {
          decryptedValues[field] = JSON.parse(
            AppHelperService.decrypt(decryptedValues[field], secretKey)
          );
        }
      });
      return decryptedValues;
    } catch {
      throw new BadRequestException('Invalid data');
    }
  }
}
