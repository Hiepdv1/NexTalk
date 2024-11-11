import { MemberRole } from '@prisma/client';
import { IsNotEmpty, IsString } from 'class-validator';

export class Members {
  @IsNotEmpty()
  @IsString()
  profileId: string;

  @IsNotEmpty()
  @IsString()
  role: MemberRole;
}

export class MemberRoleParamsDto {
  @IsNotEmpty()
  @IsString()
  serverId: string;

  @IsNotEmpty()
  @IsString()
  memberId: string;
}
