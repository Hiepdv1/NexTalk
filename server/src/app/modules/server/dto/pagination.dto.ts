import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class PaginationParamsDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  offset?: number;

  @IsOptional()
  @IsString()
  startingId?: string;
}
