import { IsNotEmpty, IsString } from 'class-validator';

export class ChannelParams {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  profileId: string;
}
