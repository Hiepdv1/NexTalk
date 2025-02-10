import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class FetchChannelMessageDto {
  @IsOptional()
  @IsString()
  cursor: string;

  @IsNotEmpty()
  @IsString()
  serverId: string;

  @IsNotEmpty()
  @IsString()
  channelId: string;
}

export class CreateChannelMessageDto {
  @IsNotEmpty()
  @IsString()
  channelId: string;

  @IsNotEmpty()
  @IsString()
  memberId: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsString()
  serverId: string;

  @IsNotEmpty()
  @IsNumber()
  timestamp: number;
}

export type Room = {
  roomId: string;
  participants: Map<
    string,
    {
      userId: string;
      producers: Producer[];
    }
  >;
  consumers: Map<string, Consumer[]>;
};

export type Consumer = {
  userId: string;
  peer: RTCPeerConnection;
  producerId: string;
  type: string;
  id: string;
};

export type Producer = {
  id: string;
  senderId: string;
  streams: readonly MediaStream[];
  kind: string;
  enabled: boolean;
  trackId: string;
  userId: string;
  peer: RTCPeerConnection;
  type: string;
};

export enum MessageModifyMethod {
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export class MessageChannelModifyDto {
  @IsNotEmpty()
  @IsString()
  channelId: string;

  @IsNotEmpty()
  @IsString()
  memberId: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  @ValidateIf((o) => o.method !== MessageModifyMethod.DELETE)
  content: string;

  @IsNotEmpty()
  @IsString()
  serverId: string;

  @IsNotEmpty()
  @IsString()
  messageId: string;

  @IsNotEmpty()
  @IsString()
  @IsEnum(MessageModifyMethod)
  method: MessageModifyMethod;
}

export class ChannelReadDto {
  @IsNotEmpty()
  @IsString()
  channelId: string;

  @IsNotEmpty()
  @IsString()
  serverId: string;
}
