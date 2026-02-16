import {IsArray, IsDefined, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateIf, ValidateNested} from 'class-validator';
import {PostStatus} from '@/modules/post/post.entity';
import {plainToInstance, Transform, Type} from 'class-transformer';

export class LocalizedTitleDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(300)
    en: string;

    @IsOptional()
    @IsString()
    @MaxLength(300)
    km?: string;
}

export class LocalizedDescriptionDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    en: string;

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

export class CreatePostDto {
    @IsDefined()
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
        return plainToInstance(LocalizedTitleDto, parsed);
    })
    @ValidateNested()
    @Type(() => LocalizedTitleDto)
    title: LocalizedTitleDto;

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
        return plainToInstance(LocalizedDescriptionDto, parsed);
    })
    @ValidateNested()
    @Type(() => LocalizedDescriptionDto)
    description?: LocalizedDescriptionDto;

    // Optional relations
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
}
