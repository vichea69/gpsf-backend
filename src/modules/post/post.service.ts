import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import {PostEntity, PostStatus} from '@/modules/post/post.entity';
import {PostImageEntity} from '@/modules/post/post-image.entity';
import slugify from 'slugify';
import {CreatePostDto} from '@/modules/post/dto/create-post.dto';
import {UpdatePostDto} from '@/modules/post/dto/update-post.dto';
import {UserEntity} from '@/modules/users/entities/user.entity';
import {R2Service} from '@/modules/post/r2.service';
import {CategoryEntity} from '@/modules/category/category.entity';
import {PageEntity} from '@/modules/page/page.entity';
import {SectionEntity} from '@/modules/section/section.entity';
import type {UploadedFilePayload} from '@/types/uploaded-file.type';

@Injectable()
export class PostService {
    constructor(
        @InjectRepository(PostEntity)
        private readonly postRepository: Repository<PostEntity>,
        @InjectRepository(PostImageEntity)
        private readonly postImageRepository: Repository<PostImageEntity>,
        @InjectRepository(CategoryEntity)
        private readonly categoryRepository: Repository<CategoryEntity>,
        @InjectRepository(PageEntity)
        private readonly pageRepository: Repository<PageEntity>,
        @InjectRepository(SectionEntity)
        private readonly sectionRepository: Repository<SectionEntity>,
        private readonly r2: R2Service,
    ) {
    }

    async create(user: UserEntity, dto: CreatePostDto, files?: UploadedFilePayload[]): Promise<PostEntity> {
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

        const savedPost = await this.postRepository.save(newPost);
        if (Array.isArray(savedPost)) {
            throw new HttpException('Unexpected save result', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (files?.length) {
            await this.addImagesToPost(savedPost, files, 0);
        }

        return this.findOne(savedPost.id);
    }

    async findAll(): Promise<PostEntity[]> {
        const posts = await this.postRepository.find({
            order: {createdAt: 'DESC'},
            relations: ['author', 'category', 'page', 'images', 'sections', 'section'],
        });
        return posts.map((post) => this.sortPostImages(post));
    }

    async findByCategory(categoryId: number): Promise<PostEntity[]> {
        const category = await this.categoryRepository.findOne({where: {id: categoryId}});
        if (!category) {
            throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
        }

        const posts = await this.postRepository.find({
            where: {category: {id: categoryId}},
            order: {createdAt: 'DESC'},
            relations: ['author', 'category', 'page', 'images', 'sections', 'section'],
        });

        return posts.map((post) => this.sortPostImages(post));
    }

    async findOne(id: number): Promise<PostEntity> {
        const post = await this.postRepository.findOne({
            where: {id},
            relations: ['author', 'category', 'page', 'images', 'sections', 'section'],
        });
        if (!post) {
            throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
        }
        return this.sortPostImages(post);
    }

    async update(id: number, dto: UpdatePostDto, files?: UploadedFilePayload[]): Promise<PostEntity> {
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

        await this.postRepository.save(post);

        const replaceIds = dto.replaceImageIds ?? [];
        const incomingFiles = files ?? [];
        const replacementFiles = replaceIds.length ? incomingFiles.slice(0, replaceIds.length) : [];
        const newFiles = replaceIds.length ? incomingFiles.slice(replaceIds.length) : incomingFiles;

        if (replaceIds.length) {
            if (!replacementFiles.length || replacementFiles.length !== replaceIds.length) {
                throw new HttpException('replaceImageIds count must match uploaded files', HttpStatus.BAD_REQUEST);
            }

            const images = await this.postImageRepository.find({
                where: {id: In(replaceIds), post: {id: post.id}},
                order: {sortOrder: 'ASC', id: 'ASC'},
            });

            const imageMap = new Map(images.map((image) => [image.id, image]));
            const urls = await this.uploadFiles(replacementFiles);

            const updates: PostImageEntity[] = [];
            replaceIds.forEach((imageId, index) => {
                const target = imageMap.get(imageId);
                if (!target) {
                    throw new HttpException(`Image ${imageId} does not belong to this post`, HttpStatus.UNPROCESSABLE_ENTITY);
                }
                target.url = urls[index];
                updates.push(target);
            });

            if (updates.length) {
                await this.postImageRepository.save(updates);
            }
        }

        if (dto.removeImageIds?.length) {
            await this.postImageRepository.delete(dto.removeImageIds);
        }

        if (newFiles.length) {
            const existingCount = await this.postImageRepository.count({where: {post: {id: post.id}}});
            await this.addImagesToPost(post, newFiles, existingCount);
        }

        if (dto.removeImageIds?.length || newFiles.length) {
            await this.reorderPostImages(post.id);
        }

        return this.findOne(post.id);
    }

    async remove(id: number): Promise<void> {
        const post = await this.findOne(id);
        await this.postRepository.remove(post);
    }

    async removeImage(postId: number, imageId: number): Promise<void> {
        const post = await this.postRepository.findOne({where: {id: postId}});
        if (!post) {
            throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
        }

        const image = await this.postImageRepository.findOne({where: {id: imageId, post: {id: postId}}});
        if (!image) {
            throw new HttpException('Image not found', HttpStatus.NOT_FOUND);
        }

        await this.postImageRepository.delete(image.id);
        await this.reorderPostImages(postId);
    }

    private async addImagesToPost(post: PostEntity, files: UploadedFilePayload[], startOrder: number): Promise<void> {
        const urls = await this.uploadFiles(files);
        const imageEntities = urls.map((url, index) =>
            this.postImageRepository.create({
                url,
                sortOrder: startOrder + index,
                post,
            }),
        );

        if (imageEntities.length) {
            await this.postImageRepository.save(imageEntities);
        }
    }

    private async uploadFiles(files: UploadedFilePayload[]): Promise<string[]> {
        return Promise.all(
            files.map((file) => {
                const key = this.generateObjectKey(file.originalname);
                return this.r2.uploadObject({key, body: file.buffer, contentType: file.mimetype});
            }),
        );
    }

    private async reorderPostImages(postId: number): Promise<void> {
        const images = await this.postImageRepository.find({
            where: {post: {id: postId}},
            order: {sortOrder: 'ASC', id: 'ASC'},
        });

        images.forEach((image, index) => {
            image.sortOrder = index;
        });

        if (images.length) {
            await this.postImageRepository.save(images);
        }
    }

    private sortPostImages(post: PostEntity): PostEntity {
        if (!post.images || post.images.length === 0) {
            post.images = [];
            return post;
        }

        post.images = [...post.images].sort((a, b) => {
            if (a.sortOrder === b.sortOrder) {
                const aId = a.id ?? Number.MAX_SAFE_INTEGER;
                const bId = b.id ?? Number.MAX_SAFE_INTEGER;
                return aId - bId;
            }
            return a.sortOrder - b.sortOrder;
        });

        return post;
    }

    private async resolveSections(sectionIds: number[]): Promise<SectionEntity[]> {
        const uniqueIds = Array.from(new Set(sectionIds));
        const sections = await this.sectionRepository.find({where: {id: In(uniqueIds)}});
        if (sections.length !== uniqueIds.length) {
            throw new HttpException('Section not found', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        return sections;
    }

    private generateObjectKey(originalName: string): string {
        const ext = originalName.includes('.') ? originalName.split('.').pop() : 'bin';
        const random = Math.random().toString(36).slice(2);
        const stamp = Date.now();
        return `uploads/posts/${stamp}-${random}.${ext}`;
    }

    private generateSlug(title: string): string {
        if (!title || typeof title !== 'string' || !title.trim()) {
            throw new HttpException('Invalid title', HttpStatus.BAD_REQUEST);
        }
        return slugify(title, {lower: true, strict: true, trim: true});
    }
}
