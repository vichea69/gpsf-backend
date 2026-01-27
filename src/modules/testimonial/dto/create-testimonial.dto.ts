import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { TestimonialStatus } from '../testimonial.entity';

export class LocalizedTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @MinLength(2)
  en: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  km?: string;
}

export class CreateTestimonialDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  quote: LocalizedTextDto;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsOptional()
  title?: LocalizedTextDto;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  authorName: LocalizedTextDto;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsOptional()
  authorRole?: LocalizedTextDto;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  company?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  avatarUrl?: string;

  @IsEnum(TestimonialStatus)
  @IsOptional()
  status?: TestimonialStatus;

  @IsInt()
  @IsOptional()
  @Min(0)
  orderIndex?: number;
}
