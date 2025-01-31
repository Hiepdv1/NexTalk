import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { IsValidSDP } from 'src/common/validators/IsValidSDPConstraint.validator';

export class CreateProducerDto {
  @IsNotEmpty()
  @IsUUID()
  channelId: string;

  @IsNotEmpty()
  @IsValidSDP()
  sdp: RTCSessionDescriptionInit;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  producerId: string;
}

export class RestartProducerDto {
  @IsNotEmpty()
  @IsUUID()
  channelId: string;

  @IsNotEmpty()
  @IsValidSDP()
  sdp: RTCSessionDescriptionInit;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsString()
  producerId: string;
}

export class PeerDisconnectedDto {
  @IsNotEmpty()
  @IsString()
  channelId: string;

  @IsNotEmpty()
  @IsString()
  producerId: string;

  @IsNotEmpty()
  @IsString()
  type: 'screen' | 'audio' | 'video';
}

class DataProducerConnected {
  @IsNotEmpty()
  @IsString()
  participantId: string;

  @IsNotEmpty()
  @IsString()
  producerId: string;

  @IsNotEmpty()
  @IsValidSDP()
  sdp: RTCSessionDescriptionInit;

  @IsOptional()
  @IsString()
  consumerId?: string;
}

export class FetchProducerExistingDto {
  @IsNotEmpty()
  @IsString()
  channelId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataProducerConnected)
  data: DataProducerConnected[];
}
