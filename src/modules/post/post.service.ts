import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import {PostEntity, PostStatus} from '@/modules/post/post.entity';
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
        files?: { coverImage?: UploadedFilePayload; document?: UploadedFilePayload },
    ): Promise<PostEntity> {
        const slug = this.generateSlug(dto.title.en);

        const exists = await this.postRepository.findOne({where: {slug}});
        if (exists) {
            throw new HttpException('Post slug already exists', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const newPost = this.postRepository.create({
            title: dto.title,
            slug,
            description: dto.description ?? undefined,
            content: dto.content ?? null,
            status: dto.status ?? PostStatus.Draft,
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
        const documentFile = files?.document;

        if (coverImageFile?.buffer) {
            newPost.coverImage = await this.uploadCoverImage(coverImageFile);
        } else if (dto.coverImage !== undefined) {
            newPost.coverImage = this.normalizeOptionalString(dto.coverImage);
        }

        if (documentFile?.buffer) {
            const media = await this.saveDocumentToMediaManager(documentFile);
            newPost.document = media.url;
            newPost.documentThumbnail = media.thumbnailUrl ?? null;
        } else if (dto.document !== undefined) {
            const normalized = this.normalizeOptionalString(dto.document);
            newPost.document = normalized;
            newPost.documentThumbnail = normalized ? await this.resolveDocumentThumbnail(normalized) : null;
        }

        if (dto.link !== undefined) {
            newPost.link = this.normalizeOptionalString(dto.link);
        }

        const savedPost = await this.postRepository.save(newPost);
        if (Array.isArray(savedPost)) {
            throw new HttpException('Unexpected save result', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return this.findOne(savedPost.id);
    }

    async findAll(page = 1, pageSize = 10): Promise<{ items: PostEntity[]; total: number }> {
        const take = Math.min(Math.max(Number(pageSize) || 10, 1), 50);
        const current = Math.max(Number(page) || 1, 1);
        const skip = (current - 1) * take;

        const [items, total] = await this.postRepository.findAndCount({
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

    async update(
        id: number,
        dto: UpdatePostDto,
        files?: { coverImage?: UploadedFilePayload; document?: UploadedFilePayload },
    ): Promise<PostEntity> {
        const post = await this.findOne(id);

        if (dto.title?.en && dto.title.en.trim() && dto.title.en !== post.title.en) {
            const newSlug = this.generateSlug(dto.title.en);
            const exists = await this.postRepository.findOne({where: {slug: newSlug}});
            if (exists && exists.id !== post.id) {
                throw new HttpException('Post slug already exists', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            post.slug = newSlug;
        }

        if (dto.title !== undefined) {
            post.title = {...post.title, ...dto.title};
        }

        if (dto.content !== undefined) {
            post.content = dto.content ?? null;
        }

        if (dto.description !== undefined) {
            const merged = {...(post.description ?? {en: ''}), ...dto.description};
            if (!merged.en || !merged.en.trim()) {
                throw new HttpException('Description en is required', HttpStatus.BAD_REQUEST);
            }
            post.description = merged;
        }

        if (dto.status !== undefined) {
            post.status = dto.status;
        }

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
        const documentFile = files?.document;

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

        if (documentFile?.buffer) {
            const media = await this.saveDocumentToMediaManager(documentFile);
            post.document = media.url;
            post.documentThumbnail = media.thumbnailUrl ?? null;
        } else if (dto.document !== undefined) {
            const normalized = this.normalizeOptionalString(dto.document);
            post.document = normalized;
            post.documentThumbnail = normalized ? await this.resolveDocumentThumbnail(normalized) : null;
        }

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

    private normalizeOptionalString(value: string | null | undefined): string | null {
        if (value === null || value === undefined) {
            return null;
        }
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
    }

    private generateSlug(title: string): string {
        if (!title || typeof title !== 'string' || !title.trim()) {
            throw new HttpException('Invalid title', HttpStatus.BAD_REQUEST);
        }
        return slugify(title, {lower: true, strict: true, trim: true});
    }
}
