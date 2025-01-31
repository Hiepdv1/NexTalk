import { IsNotEmpty, IsString } from 'class-validator';

export class IConversationDto {
  @IsNotEmpty()
  @IsString()
  participantId: string;

  @IsNotEmpty()
  @IsString()
  serverId: string;
}

export class ConversationUploadFileDto {
  @IsNotEmpty()
  @IsString()
  serverId: string;

  @IsNotEmpty()
  @IsString()
  memberId: string;

  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @IsNotEmpty()
  @IsString()
  otherMemberId: string;
}
