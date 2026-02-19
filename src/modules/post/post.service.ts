import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import {PostDocuments, PostEntity, PostStatus} from '@/modules/post/post.entity';
import slugify from 'slugify';
import {CreatePostDto} from '@/modules/post/dto/create-post.dto';
import {UpdatePostDto} from '@/modules/post/dto/update-post.dto';
import {UserEntity} from '@/modules/users/entities/user.entity';
import {CategoryEntity} from '@/modules/category/category.entity';
import {PageEntity} from '@/modules/page/page.entity';
import {SectionEntity} from '@/modules/section/section.entity';
import type {UploadedFilePayload} from '@/types/uploaded-file.type';
import {MediaService} from '@/modules/media-manager/media.service';
import type {MediaResponseInterface} from '@/modules/media-manager/types/media-response-interface';
import * as fs from 'node:fs';
import path from 'node:path';

type DocumentLocale = 'en' | 'km';

type DocumentInput = {
    url?: string | null;
    thumbnailUrl?: string | null;
} | null;

type PostDocumentInputDto = {
    document?: string | null;
    documentEn?: string | null;
    documentKm?: string | null;
    documents?: {
        en?: DocumentInput;
        km?: DocumentInput;
    } | null;
};

@Injectable()
export class PostService {
    constructor(
        @InjectRepository(PostEntity)
        private readonly postRepository: Repository<PostEntity>,
        @InjectRepository(CategoryEntity)
        private readonly categoryRepository: Repository<CategoryEntity>,
        @InjectRepository(PageEntity)
        private readonly pageRepository: Repository<PageEntity>,
        @InjectRepository(SectionEntity)
        private readonly sectionRepository: Repository<SectionEntity>,
        private readonly mediaService: MediaService,
    ) {
    }

    async create(
        user: UserEntity,
        dto: CreatePostDto,
        files?: {
            coverImage?: UploadedFilePayload;
            document?: UploadedFilePayload;
            documentEn?: UploadedFilePayload;
            documentKm?: UploadedFilePayload;
        },
    ): Promise<PostEntity> {
        const normalizedTitle = this.normalizeLocalizedText(dto.title, 'Title', true);
        const slug = this.generateSlugFromEnglish(normalizedTitle.en ?? null);
        const desiredStatus = this.resolveStatusFromInput(dto.status, dto.isPublished);
        const initialStatus = desiredStatus ?? PostStatus.Draft;
        const publishedAt = this.parseOptionalDate(dto.publishedAt, 'publishedAt');
        const expiredAt = this.parseOptionalDate(dto.expiredAt, 'expiredAt');
        this.assertDateRange(publishedAt, expiredAt);

        if (slug) {
            const exists = await this.postRepository.findOne({where: {slug}});
            if (exists) {
                throw new HttpException('Post slug already exists', HttpStatus.UNPROCESSABLE_ENTITY);
            }
        }

        const newPost = this.postRepository.create({
            title: normalizedTitle,
            slug: slug ?? null,
            description:
                dto.description !== undefined
                    ? this.normalizeLocalizedText(dto.description, 'Description', true)
                    : undefined,
            content:
                dto.content !== undefined
                    ? this.normalizeLocalizedContent(dto.content, true)
                    : null,
            status: initialStatus,
            publishedAt: initialStatus === PostStatus.Published ? (publishedAt ?? new Date()) : null,
            isFeatured: dto.isFeatured ?? false,
            expiredAt,
            author: user ?? null,
        });

        if (dto.categoryId) {
            const category = await this.categoryRepository.findOne({where: {id: dto.categoryId}});
            if (!category) {
                throw new HttpException('Category not found', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            newPost.category = category;
        }

        if (dto.pageId) {
            const page = await this.pageRepository.findOne({where: {id: dto.pageId}});
            if (!page) {
                throw new HttpException('Page not found', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            newPost.page = page;
        }

        if (dto.sectionId !== undefined) {
            if (dto.sectionId === null as any) {
                newPost.section = null;
                newPost.sectionId = null;
            } else {
                const section = await this.sectionRepository.findOne({where: {id: dto.sectionId}});
                if (!section) {
                    throw new HttpException('Section not found', HttpStatus.UNPROCESSABLE_ENTITY);
                }
                newPost.section = section;
                newPost.sectionId = section.id;
            }
        }

        if (dto.sectionIds !== undefined) {
            if (dto.sectionIds.length === 0) {
                newPost.sections = [];
            } else {
                newPost.sections = await this.resolveSections(dto.sectionIds);
            }
        }

        const coverImageFile = files?.coverImage;
        const legacyDocumentFile = files?.document;
        const documentEnFile = files?.documentEn ?? legacyDocumentFile;
        const documentKmFile = files?.documentKm;

        if (coverImageFile?.buffer) {
            newPost.coverImage = await this.uploadCoverImage(coverImageFile);
        } else if (dto.coverImage !== undefined) {
            newPost.coverImage = this.normalizeOptionalString(dto.coverImage);
        }
        newPost.documents = await this.resolveNextDocuments(
            null,
            dto,
            { document: legacyDocumentFile, documentEn: documentEnFile, documentKm: documentKmFile },
        );

        if (dto.link !== undefined) {
            newPost.link = this.normalizeOptionalString(dto.link);
        }

        const savedPost = await this.postRepository.save(newPost);
        if (Array.isArray(savedPost)) {
            throw new HttpException('Unexpected save result', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return this.findOne(savedPost.id);
    }

    async findAll(
        page = 1,
        pageSize = 20,
        isFeatured?: boolean,
    ): Promise<{ items: PostEntity[]; total: number }> {
        const take = Math.min(Math.max(Number(pageSize) || 20, 1), 50);
        const current = Math.max(Number(page) || 1, 1);
        const skip = (current - 1) * take;
        const where = isFeatured === undefined ? undefined : { isFeatured };

        const [items, total] = await this.postRepository.findAndCount({
            where,
            order: {createdAt: 'DESC'},
            relations: ['author', 'category', 'page', 'sections', 'section'],
            take,
            skip,
        });

        return { items, total };
    }

    async findByCategory(categoryId: number): Promise<PostEntity[]> {
        const category = await this.categoryRepository.findOne({where: {id: categoryId}});
        if (!category) {
            throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
        }

        const posts = await this.postRepository.find({
            where: {category: {id: categoryId}},
            order: {createdAt: 'DESC'},
            relations: ['author', 'category', 'page', 'sections', 'section'],
        });

        return posts;
    }

    async findOne(id: number): Promise<PostEntity> {
        const post = await this.postRepository.findOne({
            where: {id},
            relations: ['author', 'category', 'page', 'sections', 'section'],
        });
        if (!post) {
            throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
        }
        return post;
    }

    async findOneBySlug(slug: string): Promise<PostEntity> {
        const normalizedSlug = slug?.trim().toLowerCase();
        if (!normalizedSlug) {
            throw new HttpException('Post slug is required', HttpStatus.BAD_REQUEST);
        }

        const post = await this.postRepository.findOne({
            where: { slug: normalizedSlug },
            relations: ['author', 'category', 'page', 'sections', 'section'],
        });
        if (!post) {
            throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
        }
        return post;
    }

    async update(
        id: number,
        dto: UpdatePostDto,
        files?: {
            coverImage?: UploadedFilePayload;
            document?: UploadedFilePayload;
            documentEn?: UploadedFilePayload;
            documentKm?: UploadedFilePayload;
        },
    ): Promise<PostEntity> {
        const post = await this.findOne(id);

        if (dto.title !== undefined) {
            const mergedTitle = this.normalizeLocalizedText(
                {...(post.title ?? {}), ...dto.title},
                'Title',
                true,
            );
            post.title = mergedTitle;

            if (dto.title.en !== undefined) {
                const newSlug = this.generateSlugFromEnglish(mergedTitle.en ?? null);
                if (newSlug) {
                    const exists = await this.postRepository.findOne({where: {slug: newSlug}});
                    if (exists && exists.id !== post.id) {
                        throw new HttpException('Post slug already exists', HttpStatus.UNPROCESSABLE_ENTITY);
                    }
                }
                post.slug = newSlug;
            }
        }

        if (dto.content !== undefined) {
            post.content = this.normalizeLocalizedContent(dto.content, true);
        }

        if (dto.description !== undefined) {
            post.description = this.normalizeLocalizedText(
                {...(post.description ?? {}), ...dto.description},
                'Description',
                true,
            );
        }

        const nextStatus = this.resolveStatusFromInput(dto.status, dto.isPublished);
        if (nextStatus !== undefined) {
            post.status = nextStatus;
        }

        if (dto.publishedAt !== undefined) {
            post.publishedAt = this.parseOptionalDate(dto.publishedAt, 'publishedAt');
        }

        if (dto.isFeatured !== undefined) {
            post.isFeatured = dto.isFeatured;
        }

        if (dto.expiredAt !== undefined) {
            post.expiredAt = this.parseOptionalDate(dto.expiredAt, 'expiredAt');
        }

        if (post.status === PostStatus.Published) {
            if (!post.publishedAt) {
                post.publishedAt = new Date();
            }
        } else {
            post.publishedAt = null;
        }

        this.assertDateRange(post.publishedAt ?? null, post.expiredAt ?? null);

        if (dto.categoryId !== undefined) {
            if (dto.categoryId === null as any) {
                post.category = null;
            } else {
                const category = await this.categoryRepository.findOne({where: {id: dto.categoryId}});
                if (!category) {
                    throw new HttpException('Category not found', HttpStatus.UNPROCESSABLE_ENTITY);
                }
                post.category = category;
            }
        }

        if (dto.pageId !== undefined) {
            if (dto.pageId === null as any) {
                post.page = null;
            } else {
                const page = await this.pageRepository.findOne({where: {id: dto.pageId}});
                if (!page) {
                    throw new HttpException('Page not found', HttpStatus.UNPROCESSABLE_ENTITY);
                }
                post.page = page;
            }
        }

        if (dto.sectionId !== undefined) {
            if (dto.sectionId === null as any) {
                post.section = null;
                post.sectionId = null;
            } else {
                const section = await this.sectionRepository.findOne({where: {id: dto.sectionId}});
                if (!section) {
                    throw new HttpException('Section not found', HttpStatus.UNPROCESSABLE_ENTITY);
                }
                post.section = section;
                post.sectionId = section.id;
            }
        }

        if (dto.sectionIds !== undefined) {
            if (dto.sectionIds.length === 0) {
                post.sections = [];
            } else {
                post.sections = await this.resolveSections(dto.sectionIds);
            }
        }

        const coverImageFile = files?.coverImage;
        const legacyDocumentFile = files?.document;
        const documentEnFile = files?.documentEn ?? legacyDocumentFile;
        const documentKmFile = files?.documentKm;

        const previousCoverImage = post.coverImage ?? null;
        if (coverImageFile?.buffer) {
            post.coverImage = await this.uploadCoverImage(coverImageFile);
            if (previousCoverImage) {
                this.removeLocalFile(previousCoverImage);
            }
        } else if (dto.coverImage !== undefined) {
            const normalized = this.normalizeOptionalString(dto.coverImage);
            post.coverImage = normalized;
            if (previousCoverImage && previousCoverImage !== normalized) {
                this.removeLocalFile(previousCoverImage);
            }
        }

        post.documents = await this.resolveNextDocuments(
            post.documents ?? null,
            dto,
            { document: legacyDocumentFile, documentEn: documentEnFile, documentKm: documentKmFile },
        );

        if (dto.link !== undefined) {
            post.link = this.normalizeOptionalString(dto.link);
        }

        await this.postRepository.save(post);
        return this.findOne(post.id);
    }

    async remove(id: number): Promise<void> {
        const post = await this.findOne(id);
        const coverImageUrl = post.coverImage ?? null;
        await this.postRepository.remove(post);
        if (coverImageUrl) {
            this.removeLocalFile(coverImageUrl);
        }
    }

    private async uploadCoverImage(file: UploadedFilePayload): Promise<string> {
        const key = this.generateObjectKey(file.originalname, 'posts');
        const absolutePath = path.join(process.cwd(), key);
        const directory = path.dirname(absolutePath);

        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, {recursive: true});
        }

        fs.writeFileSync(absolutePath, file.buffer);
        return `/${key}`;
    }

    private async saveDocumentToMediaManager(file: UploadedFilePayload): Promise<MediaResponseInterface> {
        const size = file.buffer?.length ?? 0;
        const payload = {
            ...(file as Express.Multer.File),
            size,
        } as Express.Multer.File;
        return this.mediaService.saveFile(payload);
    }

    private async resolveDocumentThumbnail(url: string): Promise<string | null> {
        const relativeUrl = this.toRelativePath(url);
        const media = await this.mediaService.findByUrl(relativeUrl);
        return media?.thumbnailUrl ?? null;
    }

    private async resolveSections(sectionIds: number[]): Promise<SectionEntity[]> {
        const uniqueIds = Array.from(new Set(sectionIds));
        const sections = await this.sectionRepository.find({where: {id: In(uniqueIds)}});
        if (sections.length !== uniqueIds.length) {
            throw new HttpException('Section not found', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        return sections;
    }

    private generateObjectKey(originalName: string, folder: string): string {
        const ext = originalName.includes('.') ? originalName.split('.').pop() : 'bin';
        const random = Math.random().toString(36).slice(2);
        const stamp = Date.now();
        return `${this.getUploadRoot()}/${folder}/${stamp}-${random}.${ext}`;
    }

    private removeLocalFile(url?: string | null): void {
        if (!url) {
            return;
        }

        const relativePath = this.toRelativePath(url);
        const uploadPrefix = `/${this.getUploadRoot()}/`;
        if (!relativePath.startsWith(uploadPrefix)) {
            return;
        }

        const absolutePath = path.join(process.cwd(), relativePath.replace(/^\/+/, ''));
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }
    }

    private toRelativePath(url: string): string {
        try {
            return new URL(url).pathname;
        } catch {
            return url;
        }
    }

    private getUploadRoot(): string {
        return (process.env.LOCAL_UPLOAD_PATH || 'uploads').replace(/^\/+|\/+$/g, '');
    }

    private resolveStatusFromInput(
        status?: PostStatus,
        isPublished?: boolean,
    ): PostStatus | undefined {
        if (isPublished !== undefined) {
            return isPublished ? PostStatus.Published : PostStatus.Draft;
        }
        return status;
    }

    private parseOptionalDate(
        value: string | Date | null | undefined,
        fieldName: string,
    ): Date | null {
        if (value === undefined || value === null || value === '') {
            return null;
        }

        const parsedDate = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(parsedDate.getTime())) {
            throw new HttpException(`${fieldName} must be a valid date`, HttpStatus.BAD_REQUEST);
        }
        return parsedDate;
    }

    private assertDateRange(
        publishedAt: Date | null,
        expiredAt: Date | null,
    ): void {
        if (publishedAt && expiredAt && expiredAt.getTime() < publishedAt.getTime()) {
            throw new HttpException('expiredAt must be greater than or equal to publishedAt', HttpStatus.BAD_REQUEST);
        }
    }

    private async resolveNextDocuments(
        currentDocuments: PostDocuments | null,
        dto: PostDocumentInputDto,
        files?: {
            document?: UploadedFilePayload;
            documentEn?: UploadedFilePayload;
            documentKm?: UploadedFilePayload;
        },
    ): Promise<PostDocuments | null> {
        const next = this.cloneDocuments(currentDocuments);

        // Backward-compatible text inputs.
        if (dto.documentEn !== undefined || dto.document !== undefined) {
            await this.assignDocumentFromUrl(next, 'en', dto.documentEn ?? dto.document ?? null);
        }
        if (dto.documentKm !== undefined) {
            await this.assignDocumentFromUrl(next, 'km', dto.documentKm);
        }

        // New JSONB payload.
        if (dto.documents === null) {
            delete next.en;
            delete next.km;
        } else if (dto.documents !== undefined) {
            if (dto.documents.en !== undefined) {
                await this.assignDocumentFromInput(next, 'en', dto.documents.en);
            }
            if (dto.documents.km !== undefined) {
                await this.assignDocumentFromInput(next, 'km', dto.documents.km);
            }
        }

        // Uploaded files have highest priority.
        const legacyDocumentFile = files?.document;
        const documentEnFile = files?.documentEn ?? legacyDocumentFile;
        const documentKmFile = files?.documentKm;

        if (documentEnFile?.buffer) {
            const media = await this.saveDocumentToMediaManager(documentEnFile);
            next.en = {
                url: media.url,
                thumbnailUrl: media.thumbnailUrl ?? null,
            };
        }

        if (documentKmFile?.buffer) {
            const media = await this.saveDocumentToMediaManager(documentKmFile);
            next.km = {
                url: media.url,
                thumbnailUrl: media.thumbnailUrl ?? null,
            };
        }

        return this.normalizeDocuments(next);
    }

    private cloneDocuments(documents: PostDocuments | null): PostDocuments {
        return {
            ...(documents?.en
                ? {
                      en: {
                          url: documents.en.url,
                          thumbnailUrl: documents.en.thumbnailUrl ?? null,
                      },
                  }
                : {}),
            ...(documents?.km
                ? {
                      km: {
                          url: documents.km.url,
                          thumbnailUrl: documents.km.thumbnailUrl ?? null,
                      },
                  }
                : {}),
        };
    }

    private async assignDocumentFromInput(
        documents: PostDocuments,
        locale: DocumentLocale,
        input: DocumentInput,
    ): Promise<void> {
        if (input === null) {
            delete documents[locale];
            return;
        }

        if (!input || input.url === undefined) {
            throw new HttpException(`documents.${locale}.url is required`, HttpStatus.BAD_REQUEST);
        }

        await this.assignDocumentFromUrl(documents, locale, input.url, input.thumbnailUrl);
    }

    private async assignDocumentFromUrl(
        documents: PostDocuments,
        locale: DocumentLocale,
        url: string | null | undefined,
        thumbnailUrl?: string | null,
    ): Promise<void> {
        const normalizedUrl = this.normalizeOptionalString(url);
        if (!normalizedUrl) {
            delete documents[locale];
            return;
        }

        const normalizedThumbnail = thumbnailUrl === undefined
            ? await this.resolveDocumentThumbnail(normalizedUrl)
            : this.normalizeOptionalString(thumbnailUrl);

        documents[locale] = {
            url: normalizedUrl,
            thumbnailUrl: normalizedThumbnail,
        };
    }

    private normalizeDocuments(documents: PostDocuments): PostDocuments | null {
        const normalized: PostDocuments = {};
        if (documents.en?.url) {
            normalized.en = {
                url: documents.en.url,
                thumbnailUrl: documents.en.thumbnailUrl ?? null,
            };
        }
        if (documents.km?.url) {
            normalized.km = {
                url: documents.km.url,
                thumbnailUrl: documents.km.thumbnailUrl ?? null,
            };
        }
        return Object.keys(normalized).length ? normalized : null;
    }

    private normalizeOptionalString(value: string | null | undefined): string | null {
        if (value === null || value === undefined) {
            return null;
        }
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
    }

    private normalizeLocalizedText(
        value: { en?: string | null; km?: string | null } | null | undefined,
        fieldName: string,
        requireAtLeastOne = false,
    ): { en?: string; km?: string } {
        const en = this.normalizeOptionalString(value?.en ?? null);
        const km = this.normalizeOptionalString(value?.km ?? null);

        if (requireAtLeastOne && !en && !km) {
            throw new HttpException(`${fieldName} requires at least one language`, HttpStatus.BAD_REQUEST);
        }

        const normalized: { en?: string; km?: string } = {};
        if (en) {
            normalized.en = en;
        }
        if (km) {
            normalized.km = km;
        }
        return normalized;
    }

    private normalizeLocalizedContent(
        value:
            | {
                  en?: Record<string, unknown> | null;
                  km?: Record<string, unknown> | null;
              }
            | null
            | undefined,
        requireAtLeastOne = false,
    ): { en?: Record<string, unknown>; km?: Record<string, unknown> } | null {
        if (value === null || value === undefined) {
            return null;
        }

        const en = this.normalizeOptionalObject(value.en);
        const km = this.normalizeOptionalObject(value.km);

        if (requireAtLeastOne && !en && !km) {
            throw new HttpException('Content requires at least one language', HttpStatus.BAD_REQUEST);
        }

        const normalized: { en?: Record<string, unknown>; km?: Record<string, unknown> } = {};
        if (en) {
            normalized.en = en;
        }
        if (km) {
            normalized.km = km;
        }
        return normalized;
    }

    private normalizeOptionalObject(value: unknown): Record<string, unknown> | null {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }

        const normalized = value as Record<string, unknown>;
        return Object.keys(normalized).length ? normalized : null;
    }

    private generateSlugFromEnglish(title?: string | null): string | null {
        if (title === undefined || title === null) {
            return null;
        }

        const normalizedTitle = title.trim();
        if (!normalizedTitle) {
            return null;
        }

        const slug = slugify(normalizedTitle, {lower: true, strict: true, trim: true});
        return slug || null;
    }
}
