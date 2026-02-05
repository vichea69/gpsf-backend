import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { WorkingGroupStatus } from '@/modules/working-group/working-group.entity';

export class WorkingGroupLocalizedTextDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(2000)
  en: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  km?: string;
}

export class CreateWorkingGroupDto {
  @ValidateNested()
  @Type(() => WorkingGroupLocalizedTextDto)
  title: WorkingGroupLocalizedTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingGroupLocalizedTextDto)
  description?: WorkingGroupLocalizedTextDto | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string | null;

  @IsOptional()
  @IsEnum(WorkingGroupStatus)
  status?: WorkingGroupStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  orderIndex?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  pageId?: number | null;
}
