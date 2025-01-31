import { IsNotEqual } from '@src/common/validators';
import { IsNotEmpty, IsNumber, IsString, Length } from 'class-validator';

export class FetchConversationDto {
  @IsNotEmpty()
  @IsString()
  @IsNotEqual('memberOneId', {
    message: 'memberOneId and memberTwoId must not be the same',
  })
  memberTwoId: string;

  @IsNotEmpty()
  @IsString()
  @IsNotEqual('memberTwoId', {
    message: 'memberOneId and memberTwoId must not be the same',
  })
  memberOneId: string;

  @IsNotEmpty()
  @IsString()
  serverId: string;
}

export class CreateDirectMessageDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 1000)
  content: string;

  @IsNotEmpty()
  @IsString()
  serverId: string;

  @IsNotEmpty()
  @IsString()
  memberId: string;

  @IsNotEmpty()
  @IsNumber()
  timestamp: number;

  @IsNotEmpty()
  @IsString()
  otherMemberId: string;
}
