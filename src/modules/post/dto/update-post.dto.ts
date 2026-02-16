import {IsArray, IsDefined, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateIf, ValidateNested} from 'class-validator';
import {PostStatus} from '@/modules/post/post.entity';
import {plainToInstance, Transform, Type} from 'class-transformer';

export class LocalizedTitleUpdateDto {
    @IsOptional()
    @IsString()
    @MaxLength(300)
    en?: string;

    @IsOptional()
    @IsString()
    @MaxLength(300)
    km?: string;
}

export class LocalizedDescriptionUpdateDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    en?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    km?: string;
}

export class LocalizedContentDto {
    @IsDefined()
    @IsObject()
    en: Record<string, unknown>;

    @IsOptional()
    @IsObject()
    km?: Record<string, unknown>;
}

export class UpdatePostDto {
    @IsOptional()
    @Transform(({value}) => {
        if (value === undefined || value === '') {
            return undefined;
        }
        if (value === null) {
            return undefined;
        }
        const parsed = typeof value === 'string'
            ? (() => {
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            })()
            : value;
        return plainToInstance(LocalizedTitleUpdateDto, parsed);
    })
    @ValidateNested()
    @Type(() => LocalizedTitleUpdateDto)
    title?: LocalizedTitleUpdateDto;

    @IsOptional()
    @Transform(({value}) => {
        if (value === undefined || value === '') {
            return undefined;
        }
        if (value === null) {
            return null;
        }
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return plainToInstance(LocalizedContentDto, parsed);
            } catch {
                return value;
            }
        }
        return plainToInstance(LocalizedContentDto, value);
    })
    @ValidateNested()
    @Type(() => LocalizedContentDto)
    content?: LocalizedContentDto | null;

    @IsOptional()
    @Transform(({value}) => {
        if (value === undefined || value === '') {
            return undefined;
        }
        if (value === null) {
            return undefined;
        }
        const parsed = typeof value === 'string'
            ? (() => {
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            })()
            : value;
        return plainToInstance(LocalizedDescriptionUpdateDto, parsed);
    })
    @ValidateNested()
    @Type(() => LocalizedDescriptionUpdateDto)
    description?: LocalizedDescriptionUpdateDto;

    @IsOptional()
    @Transform(({value}) => (value === '' ? undefined : value))
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    categoryId?: number;

    @IsOptional()
    @Transform(({value}) => (value === '' ? undefined : value))
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    pageId?: number;

    @IsOptional()
    @Transform(({value}) => (value === '' ? undefined : value))
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    sectionId?: number;

    @IsOptional()
    @IsEnum(PostStatus)
    status?: PostStatus;

    @IsOptional()
    @Transform(({value}) => (value === '' ? null : value))
    @ValidateIf((_, value) => value !== null)
    @IsString()
    @MaxLength(500)
    coverImage?: string | null;

    @IsOptional()
    @Transform(({value}) => (value === '' ? null : value))
    @ValidateIf((_, value) => value !== null)
    @IsString()
    @MaxLength(500)
    document?: string | null;

    @IsOptional()
    @Transform(({value}) => (value === '' ? null : value))
    @ValidateIf((_, value) => value !== null)
    @IsString()
    @MaxLength(500)
    link?: string | null;

    @IsOptional()
    @Transform(({value}) => {
        if (value === undefined || value === '') {
            return undefined;
        }
        if (value === null) {
            return [];
        }
        const raw = Array.isArray(value) ? value : String(value).split(',');
        return raw
            .map((item) => Number(String(item).trim()))
            .filter((num) => !Number.isNaN(num));
    })
    @IsArray()
    @IsInt({each: true})
    sectionIds?: number[];

    // image replacement/removal removed with PostImageEntity
}
