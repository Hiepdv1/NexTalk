import { IsString } from 'class-validator';

export class CreateRequestNonceDto {
  @IsString()
  nonce: string;

  @IsString()
  requestMethod: string;

  @IsString()
  requestUrl: string;
}
