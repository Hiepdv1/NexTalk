import { IsNotEmpty, IsString } from 'class-validator';

export class CreateServerInput {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  profileId: string;
}

export class UpdateServerInput {
  @IsString()
  @IsNotEmpty()
  name: string;
}
