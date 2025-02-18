import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { IsValidSDP } from 'src/common/validators/IsValidSDPConstraint.validator';

export class CreateConsumerForProducerDto {
  @IsNotEmpty()
  @IsUUID()
  channelId: string;

  @IsNotEmpty()
  @IsValidSDP()
  sdp: RTCSessionDescriptionInit;

  @IsString()
  @IsNotEmpty()
  participantId: string;

  @IsString()
  @IsNotEmpty()
  kind: string;

  @IsString()
  @IsNotEmpty()
  producerId: string;

  @IsOptional()
  @IsString()
  consumerId: string;
}

export class ConsumerRestartDto {
  @IsNotEmpty()
  @IsUUID()
  channelId: string;

  @IsNotEmpty()
  @IsValidSDP()
  sdp: RTCSessionDescriptionInit;

  @IsString()
  @IsNotEmpty()
  participantId: string;

  @IsString()
  @IsNotEmpty()
  producerId: string;

  @IsString()
  @IsNotEmpty()
  consumerId: string;
}
