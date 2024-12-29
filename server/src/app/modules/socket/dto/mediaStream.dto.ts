import { IsBoolean, IsNotEmpty, IsUUID } from 'class-validator';

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
