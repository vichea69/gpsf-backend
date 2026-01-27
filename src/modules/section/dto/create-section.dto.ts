import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsDefined,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    ValidateNested,
} from "class-validator";
import { SectionBlockType, SectionSettings } from "../section.entity";

export class LocalizedTitleDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    en: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    km?: string;
}

export class SectionSettingsDto {
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    categoryIds?: number[];

    @IsOptional()
    @IsInt()
    @Min(1)
    limit?: number;

    @IsOptional()
    @IsEnum({ manual: "manual", latest: "latest" })
    sort?: SectionSettings["sort"];
}

export class CreateSectionDto {
    @IsInt()
    @Min(1)
    pageId: number;

    @IsEnum(SectionBlockType)
    blockType: SectionBlockType;

    @IsDefined()
    @ValidateNested()
    @Type(() => LocalizedTitleDto)
    title: LocalizedTitleDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => SectionSettingsDto)
    settings?: SectionSettingsDto;

    @IsOptional()
    @IsInt()
    @Min(0)
    orderIndex?: number;

    @IsOptional()
    @IsBoolean()
    enabled?: boolean;
}
