import { IsNotEmpty, IsString } from 'class-validator';

export class IConversationDto {
  @IsNotEmpty()
  @IsString()
  participantId: string;

  @IsNotEmpty()
  @IsString()
  serverId: string;
}
