import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    ValidateNested,
} from "class-validator";
import { SectionBlockType, SectionSettings } from "../section.entity";

export class LocalizedTitleDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    en?: string;

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

export class UpdateSectionDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    pageId?: number;

    @IsOptional()
    @IsEnum(SectionBlockType)
    blockType?: SectionBlockType;

    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedTitleDto)
    title?: LocalizedTitleDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => SectionSettingsDto)
    settings?: SectionSettingsDto | null;

    @IsOptional()
    @IsInt()
    @Min(0)
    orderIndex?: number;

    @IsOptional()
    @IsBoolean()
    enabled?: boolean;
}
