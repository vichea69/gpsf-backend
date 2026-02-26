import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { PageStatus } from '@/modules/page/page.entity';
import {
  LocalizedMetaDescriptionDto,
  LocalizedMetaTitleDto,
  LocalizedTitleDto,
} from './create-page.dto';

class UpdateLocalizedTitleDto extends PartialType(LocalizedTitleDto) {}
class UpdateLocalizedMetaTitleDto extends PartialType(LocalizedMetaTitleDto) {}
class UpdateLocalizedMetaDescriptionDto extends PartialType(LocalizedMetaDescriptionDto) {}

export class UpdatePageDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLocalizedTitleDto)
  title?: UpdateLocalizedTitleDto;

  @IsOptional()
  @IsEnum(PageStatus)
  status?: PageStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLocalizedMetaTitleDto)
  metaTitle?: UpdateLocalizedMetaTitleDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLocalizedMetaDescriptionDto)
  metaDescription?: UpdateLocalizedMetaDescriptionDto | null;
}
