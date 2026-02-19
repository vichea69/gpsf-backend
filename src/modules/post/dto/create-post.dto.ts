import {IsArray, IsBoolean, IsDateString, IsDefined, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateIf, ValidateNested} from 'class-validator';
import {PostStatus} from '@/modules/post/post.entity';
import {plainToInstance, Transform, Type} from 'class-transformer';

export class LocalizedTitleDto {
    @IsOptional()
    @IsString()
    @MaxLength(300)
    en?: string;

    @IsOptional()
    @IsString()
    @MaxLength(300)
    km?: string;
}

export class LocalizedDescriptionDto {
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
    @IsOptional()
    @IsObject()
    en?: Record<string, unknown>;

    @IsOptional()
    @IsObject()
    km?: Record<string, unknown>;
}

export class LocalizedDocumentItemDto {
    @IsOptional()
    @Transform(({value}) => (value === '' ? null : value))
    @ValidateIf((_, value) => value !== null)
    @IsString()
    @MaxLength(500)
    url?: string | null;

    @IsOptional()
    @Transform(({value}) => (value === '' ? null : value))
    @ValidateIf((_, value) => value !== null)
    @IsString()
    @MaxLength(600)
    thumbnailUrl?: string | null;
}

export class LocalizedDocumentsDto {
    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedDocumentItemDto)
    en?: LocalizedDocumentItemDto | null;

    @IsOptional()
    @ValidateNested()
    @Type(() => LocalizedDocumentItemDto)
    km?: LocalizedDocumentItemDto | null;
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
    @Transform(({ value }) => {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        const normalized = String(value).trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') {
            return true;
        }
        if (normalized === 'false' || normalized === '0') {
            return false;
        }
        return value;
    })
    @IsBoolean()
    isPublished?: boolean;

    @IsOptional()
    @Transform(({ value }) => (value === '' ? null : value))
    @ValidateIf((_, value) => value !== null)
    @IsDateString()
    publishedAt?: string | null;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        const normalized = String(value).trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') {
            return true;
        }
        if (normalized === 'false' || normalized === '0') {
            return false;
        }
        return value;
    })
    @IsBoolean()
    isFeatured?: boolean;

    @IsOptional()
    @Transform(({ value }) => (value === '' ? null : value))
    @ValidateIf((_, value) => value !== null)
    @IsDateString()
    expiredAt?: string | null;

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
    documentEn?: string | null;

    @IsOptional()
    @Transform(({value}) => (value === '' ? null : value))
    @ValidateIf((_, value) => value !== null)
    @IsString()
    @MaxLength(500)
    documentKm?: string | null;

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
                return plainToInstance(LocalizedDocumentsDto, parsed);
            } catch {
                return value;
            }
        }
        return plainToInstance(LocalizedDocumentsDto, value);
    })
    @ValidateNested()
    @Type(() => LocalizedDocumentsDto)
    documents?: LocalizedDocumentsDto | null;

    @IsOptional()
    @Transform(({value}) => (value === '' ? null : value))
    @ValidateIf((_, value) => value !== null)
    @IsString()
    @MaxLength(500)
    link?: string | null;
}
