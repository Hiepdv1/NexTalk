import { ChannelType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsNotGeneral } from 'src/common/validators';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  @IsNotGeneral()
  name: string;

  @IsEnum(Object.values(ChannelType))
  type: ChannelType;
}

export class ChannelEditDto {
  @IsString()
  @IsNotEmpty()
  @IsNotGeneral()
  name: string;

  @IsEnum(Object.values(ChannelType))
  type: ChannelType;
}

export class EditMessageFileDto {
  @IsString()
  channelId: string;

  @IsString()
  messageId: string;

  @IsString()
  serverId: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  thubnailWidth?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  thubnailHeight?: number;
}
