import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class MenuItemLabelDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  km?: string;
}

export class CreateMenuItemDto {
  @IsObject()
  @ValidateNested()
  @Type(() => MenuItemLabelDto)
  label: MenuItemLabelDto;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  url?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  orderIndex?: number;

  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @IsOptional()
  @Min(1)
  parentId?: number | null;
}
