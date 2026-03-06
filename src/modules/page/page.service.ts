import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { PageEntity, PageStatus } from '@/modules/page/page.entity';
import { CreatePageDto } from '@/modules/page/dto/create-page.dto';
import { UpdatePageDto } from '@/modules/page/dto/update-page.dto';
import slugify from 'slugify';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { SectionBlockType, SectionEntity } from '@/modules/section/section.entity';
import { CategoryEntity } from '@/modules/category/category.entity';
import { PostEntity, PostStatus } from '@/modules/post/post.entity';

type PageTreeCategoryNode = {
  id: number;
  name: { en: string; km?: string };
  description: { en: string; km?: string } | null;
};

type PageTreePostAuthorNode = {
  id: number;
  displayName: string;
  email: string;
};

type PageTreePostCategoryNode = {
  id: number;
  name: { en?: string; km?: string };
};

type PageTreePostPageNode = {
  id: number;
  title: { en: string; km?: string };
  slug: string;
};

type PageTreePostSectionNode = {
  id: number;
  pageId: number;
  blockType: SectionBlockType;
  title: { en: string; km?: string };
};

type PageTreePostNode = {
  id: number;
  title: { en?: string; km?: string };
  description: { en?: string; km?: string } | null;
  slug: string | null;
  content: PostEntity['content'] | null;
  status: PostStatus;
  isPublished: boolean;
  publishedAt: Date | null;
  expiredAt: Date | null;
  isFeatured: boolean;
  coverImage: string | null;
  documents: {
    en: NonNullable<PostEntity['documents']>['en'] | null;
    km: NonNullable<PostEntity['documents']>['km'] | null;
  };
  documentThumbnails: {
    en: string | null;
    km: string | null;
  };
  link: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: PageTreePostAuthorNode | null;
  category: PageTreePostCategoryNode | null;
  page: PageTreePostPageNode | null;
  section: PageTreePostSectionNode | null;
  sections: PageTreePostSectionNode[];
};

type PageTreeSectionNode = {
  id: number;
  blockType: SectionBlockType;
  title: { en: string; km?: string };
  description: { en?: string; km?: string } | null;
  settings: SectionEntity['settings'] | null;
  orderIndex: number;
  enabled: boolean;
  counts: {
    posts: number;
    categories: number;
  };
  categories: PageTreeCategoryNode[];
  posts: PageTreePostNode[];
};

export type PageTreeResponse = {
  page: {
    id: number;
    title: { en: string; km?: string };
    slug: string;
    status: PageStatus;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  counts: {
    sections: number;
    posts: number;
    categories: number;
  };
  categories: PageTreeCategoryNode[];
  sections: PageTreeSectionNode[];
};

@Injectable()
export class PageService {
  constructor(
    @InjectRepository(PageEntity)
    private readonly pageRepository: Repository<PageEntity>,
    @InjectRepository(SectionEntity)
    private readonly sectionRepository: Repository<SectionEntity>,
    @InjectRepository(PostEntity)
    private readonly postRepository: Repository<PostEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
  ) {}

  private readonly categoryDrivenSectionTypes = new Set<SectionBlockType>([
    SectionBlockType.POST_LIST,
    SectionBlockType.ANNOUNCEMENT,
  ]);

  async create(user: UserEntity, dto: CreatePageDto): Promise<PageEntity> {
    const slug = this.generateSlug(dto.title?.en);

    const exists = await this.pageRepository.findOne({ where: { slug } });
    if (exists) {
      throw new HttpException('Page slug already exists', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const page = this.pageRepository.create({
      title: dto.title,
      slug,
      status: dto.status ?? PageStatus.Draft,
      publishedAt: dto.status === PageStatus.Published ? new Date() : null,
      author: user ?? null,
      metaTitle: dto.metaTitle ?? null,
      metaDescription: dto.metaDescription ?? null,
    });

    return await this.pageRepository.save(page);
  }

  async findAll(includeDrafts = false): Promise<PageEntity[]> {
    const qb = this.pageRepository.createQueryBuilder('page')
      .leftJoinAndSelect('page.author', 'author')
      .loadRelationCountAndMap('page.sectionCount', 'page.sections')
      .orderBy('page.updatedAt', 'DESC');

    if (!includeDrafts) {
      qb.andWhere('page.status = :status', { status: PageStatus.Published });
    }

    return qb.getMany();
  }

  async findBySlug(slug: string, includeDrafts = false): Promise<PageEntity> {
    const anyPage = await this.pageRepository.findOne({ where: { slug }, relations: ['author'] });
    return this.ensurePageVisible(anyPage, includeDrafts);
  }

  async findById(id: number, includeDrafts = false): Promise<PageEntity> {
    const anyPage = await this.pageRepository.findOne({ where: { id }, relations: ['author'] });
    return this.ensurePageVisible(anyPage, includeDrafts);
  }

  async findByIdentifier(identifier: string, includeDrafts = false): Promise<PageEntity> {
    const safeIdentifier = String(identifier ?? '').trim();
    if (!safeIdentifier) {
      throw new HttpException('Page identifier is required', HttpStatus.BAD_REQUEST);
    }

    // Keep slug priority to avoid breaking pages that intentionally use numeric slugs.
    const pageBySlug = await this.pageRepository.findOne({
      where: { slug: safeIdentifier },
      relations: ['author'],
    });

    if (pageBySlug) {
      return this.ensurePageVisible(pageBySlug, includeDrafts);
    }

    if (/^\d+$/.test(safeIdentifier)) {
      const id = Number(safeIdentifier);
      if (Number.isSafeInteger(id) && id > 0) {
        const pageById = await this.pageRepository.findOne({
          where: { id },
          relations: ['author'],
        });

        if (pageById) {
          return this.ensurePageVisible(pageById, includeDrafts);
        }
      }
    }

    throw new HttpException('Page not found', HttpStatus.NOT_FOUND);
  }

  async update(identifier: string, dto: UpdatePageDto): Promise<PageEntity> {
    // Include drafts when updating; editors often update unpublished pages
    const page = await this.findByIdentifier(identifier, true);

    if (dto.status && dto.status !== page.status) {
      if (dto.status === PageStatus.Published && !page.publishedAt) {
        page.publishedAt = new Date();
      }
      if (dto.status === PageStatus.Draft) {
        page.publishedAt = null;
      }
    }

    const mergedTitle = dto.title ? { ...page.title, ...dto.title } : page.title;
    if (!mergedTitle.en || !mergedTitle.en.trim()) {
      throw new HttpException('Title en is required', HttpStatus.BAD_REQUEST);
    }
    const nextSlug = this.generateSlug(mergedTitle.en);
    if (nextSlug !== page.slug) {
      const existingPage = await this.pageRepository.findOne({ where: { slug: nextSlug } });
      if (existingPage && existingPage.id !== page.id) {
        throw new HttpException('Page slug already exists', HttpStatus.UNPROCESSABLE_ENTITY);
      }
      page.slug = nextSlug;
    }

    const mergedMetaTitle = dto.metaTitle === null
      ? null
      : dto.metaTitle
        ? { ...(page.metaTitle ?? {}), ...dto.metaTitle }
        : page.metaTitle;

    const mergedMetaDescription = dto.metaDescription === null
      ? null
      : dto.metaDescription
        ? { ...(page.metaDescription ?? {}), ...dto.metaDescription }
        : page.metaDescription;

    Object.assign(page, {
      title: mergedTitle,
      status: dto.status ?? page.status,
      metaTitle: mergedMetaTitle,
      metaDescription: mergedMetaDescription,
    });

    return await this.pageRepository.save(page);
  }

  async remove(id: number): Promise<void> {
    const page = await this.findById(id, true);
    await this.pageRepository.remove(page);
  }

  async getTree(identifier: string, includeDrafts = false): Promise<PageTreeResponse> {
    const page = await this.findByIdentifier(identifier, includeDrafts);
    const sections = await this.sectionRepository.find({
      where: { pageId: page.id },
      order: { orderIndex: 'ASC', createdAt: 'ASC' },
    });

    const sectionIds = sections.map((section) => section.id);

    const postsQuery = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.page', 'page')
      .leftJoinAndSelect('post.section', 'section')
      .leftJoinAndSelect('post.sections', 'linkedSections')
      .where(
        new Brackets((qb) => {
          qb.where('page.id = :pageId', { pageId: page.id });
          if (sectionIds.length) {
            qb.orWhere('section.id IN (:...sectionIds)', { sectionIds });
            qb.orWhere('linkedSections.id IN (:...sectionIds)', { sectionIds });
          }
        }),
      )
      .orderBy('post.createdAt', 'DESC');

    if (!includeDrafts) {
      postsQuery.andWhere('post.status = :status', { status: PostStatus.Published });
    }

    const rawPosts = await postsQuery.getMany();
    const posts = Array.from(new Map(rawPosts.map((post) => [post.id, post])).values());

    const postsBySectionId = new Map<number, PostEntity[]>();
    const sectionCategoryIds = new Map<number, Set<number>>();
    sections.forEach((section) => {
      postsBySectionId.set(section.id, []);
      sectionCategoryIds.set(
        section.id,
        new Set(
          (section.settings?.categoryIds ?? []).filter((id): id is number => typeof id === 'number'),
        ),
      );
    });

    posts.forEach((post) => {
      if (post.section?.id && postsBySectionId.has(post.section.id)) {
        postsBySectionId.get(post.section.id)?.push(post);
      }

      post.sections?.forEach((section) => {
        const list = postsBySectionId.get(section.id);
        if (!list || list.some((item) => item.id === post.id)) {
          return;
        }
        list.push(post);
      });
    });

    sections.forEach((section) => {
      if (!this.categoryDrivenSectionTypes.has(section.blockType)) {
        return;
      }

      const categoryIds = Array.from(sectionCategoryIds.get(section.id) ?? []);
      if (!categoryIds.length) {
        return;
      }

      const list = postsBySectionId.get(section.id) ?? [];
      posts.forEach((post) => {
        const categoryId = post.category?.id;
        if (!categoryId || !categoryIds.includes(categoryId)) {
          return;
        }
        if (!list.some((item) => item.id === post.id)) {
          list.push(post);
        }
      });
      postsBySectionId.set(section.id, list);
    });

    const allCategoryIds = new Set<number>();
    sectionCategoryIds.forEach((ids) => ids.forEach((id) => allCategoryIds.add(id)));
    sections.forEach((section) => {
      const sectionPosts = Array.from(
        new Map((postsBySectionId.get(section.id) ?? []).map((post) => [post.id, post])).values(),
      );

      sectionPosts.forEach((post) => {
        if (post.category?.id) {
          allCategoryIds.add(post.category.id);
        }
      });
    });

    const categories = allCategoryIds.size
      ? await this.categoryRepository.find({
          where: { id: In(Array.from(allCategoryIds)) },
          order: { createdAt: 'DESC' },
        })
      : [];
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    const sectionReferencedPostIds = new Set<number>();
    const sectionNodes = sections.map((section) => {
      const sectionPosts = Array.from(
        new Map((postsBySectionId.get(section.id) ?? []).map((post) => [post.id, post])).values(),
      );
      sectionPosts.forEach((post) => sectionReferencedPostIds.add(post.id));

      const relatedCategoryIds = new Set<number>(sectionCategoryIds.get(section.id) ?? []);
      sectionPosts.forEach((post) => {
        if (post.category?.id) {
          relatedCategoryIds.add(post.category.id);
        }
      });

      const relatedCategories = Array.from(relatedCategoryIds)
        .map((id) => categoryMap.get(id))
        .filter((category): category is CategoryEntity => Boolean(category));

      return {
        id: section.id,
        blockType: section.blockType,
        title: section.title,
        description: section.description ?? null,
        settings: section.settings ?? null,
        orderIndex: section.orderIndex,
        enabled: section.enabled,
        counts: {
          posts: sectionPosts.length,
          categories: relatedCategories.length,
        },
        categories: relatedCategories.map((category) => this.toTreeCategoryNode(category)),
        posts: sectionPosts.map((post) => this.toTreePostNode(post)),
      };
    });

    return {
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        publishedAt: page.publishedAt ?? null,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      },
      counts: {
        sections: sections.length,
        posts: sectionReferencedPostIds.size,
        categories: categories.length,
      },
      categories: categories.map((category) => this.toTreeCategoryNode(category)),
      sections: sectionNodes,
    };
  }

  private generateSlug(titleEn: string): string {
    if (!titleEn || typeof titleEn !== 'string' || !titleEn.trim()) {
      throw new HttpException('Invalid title', HttpStatus.BAD_REQUEST);
    }
    return slugify(titleEn, { lower: true, strict: true, trim: true });
  }

  private ensurePageVisible(page: PageEntity | null, includeDrafts: boolean): PageEntity {
    if (!page) {
      throw new HttpException('Page not found', HttpStatus.NOT_FOUND);
    }

    if (!includeDrafts && page.status !== PageStatus.Published) {
      throw new HttpException('Page not found', HttpStatus.NOT_FOUND);
    }

    return page;
  }

  private toTreeCategoryNode(category: CategoryEntity): PageTreeCategoryNode {
    return {
      id: category.id,
      name: category.name,
      description: category.description ?? null,
    };
  }

  private toTreePostNode(post: PostEntity): PageTreePostNode {
    const documents = post.documents ?? null;
    const documentEn = documents?.en ?? null;
    const documentKm = documents?.km ?? null;

    return {
      id: post.id,
      title: post.title,
      description: post.description ?? null,
      slug: post.slug ?? null,
      content: post.content ?? null,
      status: post.status,
      isPublished: post.status === PostStatus.Published,
      publishedAt: post.publishedAt ?? null,
      expiredAt: post.expiredAt ?? null,
      isFeatured: post.isFeatured ?? false,
      coverImage: post.coverImage ?? null,
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
        ? { id: post.section.id, pageId: post.section.pageId, blockType: post.section.blockType, title: post.section.title }
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
}
