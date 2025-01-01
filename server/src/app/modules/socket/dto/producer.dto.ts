import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
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
