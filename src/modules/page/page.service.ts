import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageEntity, PageStatus } from '@/modules/page/page.entity';
import { CreatePageDto } from '@/modules/page/dto/create-page.dto';
import { UpdatePageDto } from '@/modules/page/dto/update-page.dto';
import slugify from 'slugify';
import { UserEntity } from '@/modules/users/entities/user.entity';

@Injectable()
export class PageService {
  constructor(
    @InjectRepository(PageEntity)
    private readonly pageRepository: Repository<PageEntity>,
  ) {}

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
}
