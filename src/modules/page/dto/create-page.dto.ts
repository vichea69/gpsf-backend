import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { PageStatus } from '@/modules/page/page.entity';

export class LocalizedTitleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @MinLength(2)
  en: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  km?: string;
}

export class LocalizedMetaTitleDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  km?: string;
}

export class LocalizedMetaDescriptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  km?: string;
}

export class CreatePageDto {
  @ValidateNested()
  @Type(() => LocalizedTitleDto)
  title: LocalizedTitleDto;

  @IsEnum(PageStatus)
  @IsOptional()
  status?: PageStatus;

  // SEO
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedMetaTitleDto)
  metaTitle?: LocalizedMetaTitleDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedMetaDescriptionDto)
  metaDescription?: LocalizedMetaDescriptionDto | null;

}
