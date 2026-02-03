import {IsArray, IsDefined, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateNested} from 'class-validator';
import {PostStatus} from '@/modules/post/post.entity';
import {plainToInstance, Transform, Type} from 'class-transformer';

export class LocalizedTitleUpdateDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    en?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
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
        return plainToInstance(LocalizedTitleUpdateDto, parsed);
    })
    @ValidateNested()
    @Type(() => LocalizedTitleUpdateDto)
    description?: LocalizedTitleUpdateDto;

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
    @Transform(({value}) => {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        const raw = Array.isArray(value) ? value : String(value).split(',');
        const parsed = raw
            .map((item) => Number(String(item).trim()))
            .filter((num) => !Number.isNaN(num));
        return parsed.length ? parsed : undefined;
    })
    @IsArray()
    @IsInt({each: true})
    replaceImageIds?: number[];

    @IsOptional()
    @Transform(({value}) => {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        const raw = Array.isArray(value) ? value : String(value).split(',');
        const parsed = raw
            .map((item) => Number(String(item).trim()))
            .filter((num) => !Number.isNaN(num));
        return parsed.length ? parsed : undefined;
    })
    @IsArray()
    @IsInt({each: true})
    removeImageIds?: number[];
}
