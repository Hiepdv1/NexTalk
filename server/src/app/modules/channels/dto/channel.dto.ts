import { ChannelType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
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
