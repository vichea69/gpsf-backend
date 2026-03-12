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

    private readonly sectionTypesWithDirectPosts: SectionBlockType[] = [
        SectionBlockType.HERO_BANNER,
        SectionBlockType.TEXT_BLOCK,
        SectionBlockType.ANNUAL_REPORTS,
        SectionBlockType.ISSUES_RESPONSES,
        SectionBlockType.WG_TEMPLATE,
        SectionBlockType.STATS,
        SectionBlockType.BENEFITS,
        SectionBlockType.WORKING_GROUP_CO_CHAIRS,
        SectionBlockType.ANNOUNCEMENT,
    ];

    private readonly sectionTypesWithCategoryPosts: SectionBlockType[] = [
        SectionBlockType.POST_LIST,
        SectionBlockType.ANNOUNCEMENT,
    ];

    async getSectionsForPage(pageIdentifier: string, includeDrafts = false, includePosts = false): Promise<SectionResponse> {
        const safeIdentifier = pageIdentifier?.trim();
        if (!safeIdentifier) {
            throw new HttpException("Page identifier is required", HttpStatus.BAD_REQUEST);
        }
        const page = await this.pageService.findByIdentifier(safeIdentifier, includeDrafts);

        const sections = await this.sectionRepository.find({
            where: { page: { id: page.id }, enabled: true },
            relations: ["page"],
            order: { orderIndex: "ASC", createdAt: "ASC" },
        });

        const postsByCategoryId = new Map<number, SectionBlockPost[]>();
        const postsBySectionId = new Map<number, SectionBlockPost[]>();
        if (includePosts) {
            const categoryIds = [
                ...new Set(
                    sections
                        .filter((section) =>
                            this.sectionTypesWithCategoryPosts.includes(section.blockType),
                        )
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
                    relations: ["author", "category", "page", "section", "sections"],
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

            const sectionIds = [
                ...new Set(
                    sections
                        .filter((section) =>
                            this.sectionTypesWithDirectPosts.includes(section.blockType),
                        )
                        .map((section) => section.id),
                ),
            ];
            if (sectionIds.length) {
                const where = includeDrafts
                    ? { sectionId: In(sectionIds) }
                    : { sectionId: In(sectionIds), status: PostStatus.Published };
                const posts = await this.postRepository.find({
                    where,
                    relations: ["author", "category", "page", "section", "sections"],
                    order: { createdAt: "DESC" },
                });

                posts.forEach((post) => {
                    const sectionId = post.sectionId;
                    if (!sectionId) {
                        return;
                    }
                    const list = postsBySectionId.get(sectionId) ?? [];
                    list.push(this.toPostBlock(post));
                    postsBySectionId.set(sectionId, list);
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

                const isCategoryDriven = this.sectionTypesWithCategoryPosts.includes(section.blockType);
                const categoryIds = section.settings?.categoryIds ?? [];
                if (isCategoryDriven && categoryIds.length) {
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
                }

                if (section.blockType !== SectionBlockType.POST_LIST) {
                    if (this.sectionTypesWithDirectPosts.includes(section.blockType)) {
                        block.posts = postsBySectionId.get(section.id) ?? [];
                        return block;
                    }
                    block.posts = [];
                    return block;
                }

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

    async listSections(pageId?: number, pageSlug?: string): Promise<SectionEntity[]> {
        if (pageId !== undefined || pageSlug) {
            const filteredSections = await this.createSectionListQuery()
                // Prefer pageId for CMS selects because dropdowns usually store ids.
                .andWhere(
                    pageId !== undefined ? "page.id = :pageId" : "page.slug = :slug",
                    pageId !== undefined ? { pageId } : { slug: pageSlug },
                )
                .getMany();

            // If the selected page has no linked sections, fall back to all sections.
            if (filteredSections.length > 0) {
                return filteredSections;
            }
        }

        return await this.createSectionListQuery().getMany();
    }

    private createSectionListQuery() {
        return this.sectionRepository
            .createQueryBuilder("section")
            .leftJoinAndSelect("section.page", "page")
            .orderBy("section.orderIndex", "ASC")
            .addOrderBy("section.createdAt", "ASC");
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
            description: this.normalizeDescription(dto.description),
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
        if (dto.description !== undefined) {
            if (dto.description === null) {
                section.description = null;
            } else {
                const merged = { ...(section.description ?? {}), ...dto.description };
                section.description = this.normalizeDescription(merged);
            }
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
            description: section.description ?? null,
            settings: section.settings ?? null,
            orderIndex: section.orderIndex,
            enabled: section.enabled,
            createdAt: section.createdAt,
            updatedAt: section.updatedAt,
        };
    }

    private toPostBlock(post: PostEntity): SectionBlockPost {
        const documents = post.documents ?? null;
        const documentEn = documents?.en ?? null;
        const documentKm = documents?.km ?? null;

        return {
            id: post.id,
            title: post.title,
            slug: post.slug ?? null,
            description: post.description ?? null,
            content: post.content ?? null,
            status: post.status,
            isPublished: post.status === PostStatus.Published,
            publishedAt: post.publishedAt ?? null,
            isFeatured: post.isFeatured ?? false,
            expiredAt: post.expiredAt ?? null,
            coverImage: post.coverImage ?? null,
            document: documentEn?.url ?? documentKm?.url ?? null,
            documentThumbnail: documentEn?.thumbnailUrl ?? documentKm?.thumbnailUrl ?? null,
            documents: {
                en: documentEn,
                km: documentKm,
            },
            documentThumbnails: {
                en: documentEn?.thumbnailUrl ?? null,
                km: documentKm?.thumbnailUrl ?? null,
            },
            link: post.link ?? null,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            author: post.author
                ? { id: post.author.id, displayName: post.author.username, email: post.author.email }
                : null,
            category: post.category ? { id: post.category.id, name: post.category.name } : null,
            page: post.page ? { id: post.page.id, title: post.page.title, slug: post.page.slug } : null,
            section: post.section
                ? {
                    id: post.section.id,
                    pageId: post.section.pageId,
                    blockType: post.section.blockType,
                    title: post.section.title,
                }
                : null,
            sections:
                post.sections?.map((section) => ({
                    id: section.id,
                    pageId: section.pageId,
                    blockType: section.blockType,
                    title: section.title,
                })) ?? [],
        };
    }

    private normalizeDescription(
        value?: { en?: string; km?: string } | null,
    ): { en?: string; km?: string } | null {
        if (value === undefined || value === null) {
            return null;
        }

        const normalized = {
            ...(value.en !== undefined ? { en: value.en } : {}),
            ...(value.km !== undefined ? { km: value.km } : {}),
        };

        return Object.keys(normalized).length ? normalized : null;
    }
}
