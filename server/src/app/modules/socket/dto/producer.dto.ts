import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
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
