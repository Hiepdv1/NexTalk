import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

class QueryDto {
  @IsString()
  @IsNotEmpty()
  serverId: string;

  @IsString()
  @IsNotEmpty()
  channelId: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @Length(1)
  content: string;

  @IsObject()
  @ValidateNested()
  @Type(() => QueryDto)
  query: QueryDto;
}
