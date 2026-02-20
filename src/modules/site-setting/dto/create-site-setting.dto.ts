import {
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toInstance<T>(value: unknown, ctor: new () => T): T | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (value === null) {
    return undefined;
  }
  return plainToInstance(ctor, parseJsonValue(value));
}

function toArray<T>(value: unknown, ctor: new () => T): T[] | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (value === null) {
    return [];
  }
  const parsed = parseJsonValue(value);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list.map((item) => plainToInstance(ctor, item));
}

export class LocalizedTextDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  km?: string;
}

export class ContactDeskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(150, { each: true })
  emails: string[];
}

export class ContactLanguageDto {
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  phones: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDeskDto)
  desks: ContactDeskDto[];
}

export class LocalizedContactDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactLanguageDto)
  en?: ContactLanguageDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactLanguageDto)
  km?: ContactLanguageDto;
}

export class SocialLinkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  icon: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsUrl()
  @MaxLength(500)
  url: string;
}

export class CreateSiteSettingDto {
  @IsDefined()
  @Transform(({ value }) => toInstance(value, LocalizedTextDto))
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @IsOptional()
  @Transform(({ value }) => toInstance(value, LocalizedTextDto))
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @MaxLength(600)
  logo?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @MaxLength(600)
  footerBackground?: string | null;

  @IsOptional()
  @Transform(({ value }) => toInstance(value, LocalizedTextDto))
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  address?: LocalizedTextDto;

  @IsOptional()
  @Transform(({ value }) => toInstance(value, LocalizedContactDto))
  @ValidateNested()
  @Type(() => LocalizedContactDto)
  contact?: LocalizedContactDto;

  @IsOptional()
  @Transform(({ value }) => toInstance(value, LocalizedTextDto))
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  openTime?: LocalizedTextDto;

  @IsOptional()
  @Transform(({ value }) => toArray(value, SocialLinkDto))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];
}
