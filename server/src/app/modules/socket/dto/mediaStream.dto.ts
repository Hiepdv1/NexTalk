import { IsBoolean, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class MediaStatuChangeDto {
  @IsNotEmpty()
  @IsUUID()
  channelId: string;

  @IsBoolean()
  @IsNotEmpty()
  isMic: boolean;

  @IsBoolean()
  @IsNotEmpty()
  isCamera: boolean;
}

export class IceCandidateProducerDto {
  candidate: RTCIceCandidate | RTCIceCandidate[];

  @IsNotEmpty()
  @IsString()
  roomId: string;

  @IsNotEmpty()
  @IsString()
  producerId: string;
}

export class IceCandidateConsumerDto {
  candidate: RTCIceCandidate | RTCIceCandidate[];

  @IsNotEmpty()
  @IsString()
  roomId: string;

  @IsNotEmpty()
  @IsString()
  consumerId: string;
}
