import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DeepPartial, In } from "typeorm";
import { SectionBlockType, SectionEntity } from "./section.entity";
import { SectionResponse, SectionBlock, SectionBlockPost } from "./types/section-response-interface";
import { PageService } from "@/modules/page/page.service";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { PostEntity, PostStatus } from "@/modules/post/post.entity";

@Injectable()
export class SectionService {
    constructor(
        @InjectRepository(SectionEntity)
        private readonly sectionRepository: Repository<SectionEntity>,
        @InjectRepository(PostEntity)
        private readonly postRepository: Repository<PostEntity>,
        @Inject(forwardRef(() => PageService))
        private readonly pageService: PageService,
    ) {}

    async getSectionsForPage(slug: string, includeDrafts = false, includePosts = false): Promise<SectionResponse> {
        const safeSlug = slug?.trim();
        if (!safeSlug) {
            throw new HttpException("Page slug is required", HttpStatus.BAD_REQUEST);
        }
        const page = await this.pageService.findBySlug(safeSlug, includeDrafts);

        const sections = await this.sectionRepository.find({
            where: { page: { id: page.id }, enabled: true },
            relations: ["page"],
            order: { orderIndex: "ASC", createdAt: "ASC" },
        });

        const postsByCategoryId = new Map<number, SectionBlockPost[]>();
        if (includePosts) {
            const categoryIds = [
                ...new Set(
                    sections
                        .filter((section) => section.blockType === SectionBlockType.POST_LIST)
                        .flatMap((section) => section.settings?.categoryIds ?? [])
                        .filter((id): id is number => typeof id === "number"),
                ),
            ];
            if (categoryIds.length) {
                const where = includeDrafts
                    ? { category: { id: In(categoryIds) } }
                    : { category: { id: In(categoryIds) }, status: PostStatus.Published };

                const posts = await this.postRepository.find({
                    where,
                    relations: ["author", "category", "page", "images"],
                    order: { createdAt: "DESC" },
                });

                posts.forEach((post) => {
                    const categoryId = post.category?.id;
                    if (!categoryId) {
                        return;
                    }
                    const list = postsByCategoryId.get(categoryId) ?? [];
                    list.push(this.toPostBlock(post));
                    postsByCategoryId.set(categoryId, list);
                });
            }
        }

        return {
            page: page.title,
            slug: page.slug,
            blocks: sections.map((section) => {
                const block = this.toBlock(section);
                if (!includePosts) {
                    return block;
                }

                if (section.blockType !== SectionBlockType.POST_LIST) {
                    block.posts = [];
                    return block;
                }

                const categoryIds = section.settings?.categoryIds ?? [];
                if (!categoryIds.length) {
                    block.posts = [];
                    return block;
                }

                const merged = categoryIds.flatMap((id) => postsByCategoryId.get(id) ?? []);
                const unique = new Map<number, SectionBlockPost>();
                merged.forEach((post) => unique.set(post.id, post));
                let posts = Array.from(unique.values());
                const limit = section.settings?.limit;
                if (typeof limit === "number" && limit > 0) {
                    posts = posts.slice(0, limit);
                }
                block.posts = posts;
                return block;
            }),
        };
    }

    async listSections(pageSlug?: string): Promise<SectionEntity[]> {
        const qb = this.sectionRepository
            .createQueryBuilder("section")
            .leftJoinAndSelect("section.page", "page")
            .orderBy("section.orderIndex", "ASC")
            .addOrderBy("section.createdAt", "ASC");

        if (pageSlug) {
            qb.andWhere("page.slug = :slug", { slug: pageSlug });
        }

        return await qb.getMany();
    }

    async findSectionById(id: number): Promise<SectionEntity> {
        const section = await this.sectionRepository.findOne({
            where: { id },
            relations: ["page"],
        });
        if (!section) {
            throw new HttpException("Section not found", HttpStatus.NOT_FOUND);
        }
        return section;
    }

    async createSection(dto: CreateSectionDto): Promise<SectionEntity> {
        const page = await this.pageService.findById(dto.pageId, true);
        const section = this.sectionRepository.create({
            page,
            pageId: page.id,
            blockType: dto.blockType,
            title: dto.title,
            settings: dto.settings ?? null,
            orderIndex: dto.orderIndex ?? 0,
            enabled: dto.enabled ?? true,
        } as DeepPartial<SectionEntity>);

        return await this.sectionRepository.save(section);
    }

    async updateSection(id: number, dto: UpdateSectionDto): Promise<SectionEntity> {
        const section = await this.findSectionById(id);

        if (dto.pageId) {
            const page = await this.pageService.findById(dto.pageId, true);
            section.page = page;
            section.pageId = page.id;
        }
        if (dto.blockType) {
            section.blockType = dto.blockType;
        }
        if (dto.title !== undefined) {
            section.title = { ...section.title, ...dto.title };
        }
        if (dto.settings !== undefined) {
            section.settings = dto.settings ?? undefined;
        }
        if (dto.orderIndex !== undefined) {
            section.orderIndex = dto.orderIndex;
        }
        if (dto.enabled !== undefined) {
            section.enabled = dto.enabled;
        }

        return await this.sectionRepository.save(section);
    }

    async deleteSection(id: number): Promise<void> {
        const section = await this.findSectionById(id);
        await this.sectionRepository.remove(section);
    }

    private toBlock(section: SectionEntity): SectionBlock {
        return {
            id: section.id,
            type: section.blockType,
            title: section.title,
            settings: section.settings ?? null,
            orderIndex: section.orderIndex,
            enabled: section.enabled,
            createdAt: section.createdAt,
            updatedAt: section.updatedAt,
        };
    }

    private toPostBlock(post: PostEntity): SectionBlockPost {
        const images = [...(post.images ?? [])].sort((a, b) => {
            if (a.sortOrder === b.sortOrder) {
                const aId = a.id ?? Number.MAX_SAFE_INTEGER;
                const bId = b.id ?? Number.MAX_SAFE_INTEGER;
                return aId - bId;
            }
            return a.sortOrder - b.sortOrder;
        });

        return {
            id: post.id,
            title: post.title,
            slug: post.slug ?? null,
            content: post.content ?? null,
            status: post.status,
            images: images.map((image) => ({
                id: image.id,
                url: image.url,
                sortOrder: image.sortOrder,
            })),
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            author: post.author
                ? { id: post.author.id, displayName: post.author.username, email: post.author.email }
                : null,
            category: post.category ? { id: post.category.id, name: post.category.name } : null,
            page: post.page ? { id: post.page.id, title: post.page.title, slug: post.page.slug } : null,
        };
    }
}
