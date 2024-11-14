import { MemberRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
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

export class ProfileDto {
  @IsUUID()
  id: string;

  @IsUUID()
  userId: string;

  @IsString()
  name: string;

  @IsString()
  imageUrl: string;

  @IsEmail()
  email: string;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}

export class MemberDataDto {
  @IsUUID()
  id: string;

  @IsEnum(MemberRole)
  role: MemberRole;

  @IsUUID()
  profileId: string;

  @IsUUID()
  serverId: string;

  @ValidateNested()
  @Type(() => ProfileDto)
  profile: ProfileDto;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}
