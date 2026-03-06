import { Body, Controller, Delete, forwardRef, Get, Inject, Param, ParseIntPipe, Post, Put, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { PageService } from '@/modules/page/page.service';
import { CreatePageDto } from '@/modules/page/dto/create-page.dto';
import { UpdatePageDto } from '@/modules/page/dto/update-page.dto';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { PermissionsGuard } from '@/modules/roles/guards/permissions.guard';
import { Permissions } from '@/modules/roles/decorator/permissions.decorator';
import { Resource } from '@/modules/roles/enums/resource.enum';
import { Action } from '@/modules/roles/enums/actions.enum';
import { Role } from '@/modules/auth/enums/role.enum';
import { User } from '@/modules/auth/decorators/user.decorator';
import { SectionService } from '@/modules/section/section.service';
import { UserEntity } from '@/modules/users/entities/user.entity';

@Controller('pages')
export class PageController {
  constructor(
    private readonly pageService: PageService,
    @Inject(forwardRef(() => SectionService))
    private readonly sectionService: SectionService,
  ) {}

  @Get()
  async findAll(
    @Query('lang') lang?: string,
  ) {
    const resolvedLang = this.normalizeLang(lang);
    // Always include both draft and published pages
    const items = await this.pageService.findAll(true);

    const data = items.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: this.pickLocalized(p.title, resolvedLang),
      status: p.status,
      publishedAt: p.publishedAt ?? null,
      sectionCount: p.sectionCount ?? 0,
       seo: {
        metaTitle: this.pickLocalized(p.metaTitle, resolvedLang),
        metaDescription: this.pickLocalized(p.metaDescription, resolvedLang),
      },
      authorId: p.author
        ? { id: p.author.id, displayName: p.author.username, email: p.author.email }
        : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return {
      total: items.length,
      data,
    };
  }

  @Get(':identifier')
  async findOne(
    @Param('identifier') identifier: string,
    @Query('includeDrafts') includeDrafts?: string,
    @Query('lang') lang?: string,
    @User() user?: UserEntity,
  ) {
    const isPrivileged = user?.role === Role.Admin || user?.role === Role.Editor;
    const wantsDrafts = ['true','1','yes','y'].includes(String(includeDrafts).toLowerCase());
    const resolvedLang = this.normalizeLang(lang);
    // Allow drafts if:
    // - Admin/Editor (default, unless includeDrafts=false), or
    // - Client explicitly asks via includeDrafts=true (useful for previews)
    const canViewDrafts = (isPrivileged && (includeDrafts === undefined || wantsDrafts)) || (!isPrivileged && wantsDrafts);
    const p = await this.pageService.findByIdentifier(identifier, canViewDrafts);
    return {
      id: p.id,
      title: this.pickLocalized(p.title, resolvedLang),
      slug: p.slug,
      status: p.status,
      publishedAt: p.publishedAt ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      authorId: p.author ? { id: p.author.id, displayName: p.author.username, email: p.author.email } : null,
      seo: {
        metaTitle: this.pickLocalized(p.metaTitle, resolvedLang),
        metaDescription: this.pickLocalized(p.metaDescription, resolvedLang),
      },
    };
  }

  @Get(':identifier/section')
  async getSections(
    @Param('identifier') identifier: string,
    @Query('includeDrafts') includeDrafts?: string,
    @Query('includePosts') includePosts?: string,
    @User() user?: UserEntity,
  ) {
    const isPrivileged = user?.role === Role.Admin || user?.role === Role.Editor;
    const wantsDrafts = ['true','1','yes','y'].includes(String(includeDrafts).toLowerCase());
    const canViewDrafts = (isPrivileged && (includeDrafts === undefined || wantsDrafts)) || (!isPrivileged && wantsDrafts);
    const wantsPosts =
      includePosts === undefined || ['true','1','yes','y'].includes(String(includePosts).toLowerCase());

    return this.sectionService.getSectionsForPage(identifier, canViewDrafts, wantsPosts);
  }

  @Get(':identifier/tree')
  async getTree(
    @Param('identifier') identifier: string,
    @Query('includeDrafts') includeDrafts?: string,
    @User() user?: UserEntity,
  ) {
    const isPrivileged = user?.role === Role.Admin || user?.role === Role.Editor;
    const wantsDrafts = ['true','1','yes','y'].includes(String(includeDrafts).toLowerCase());
    const canViewDrafts = (isPrivileged && (includeDrafts === undefined || wantsDrafts)) || (!isPrivileged && wantsDrafts);

    return this.pageService.getTree(identifier, canViewDrafts);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Pages, actions: [Action.Create] })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  create(@User() user: UserEntity, @Body() dto: CreatePageDto) {
    return this.pageService.create(user, dto);
  }

  @Put(':identifier')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Pages, actions: [Action.Update] })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  update(@Param('identifier') identifier: string, @Body() dto: UpdatePageDto) {
    return this.pageService.update(identifier, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Pages, actions: [Action.Delete] })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pageService.remove(id);
  }

  private normalizeLang(lang?: string): 'en' | 'km' | undefined {
    const normalized = String(lang ?? '').toLowerCase();
    if (normalized === 'en' || normalized === 'km') {
      return normalized;
    }
    return undefined;
  }

  private pickLocalized<T extends { en?: string; km?: string } | null | undefined>(
    value: T,
    lang?: 'en' | 'km',
  ) {
    if (!lang) {
      return value ?? null;
    }
    if (!value) {
      return null;
    }
    return value[lang] ?? value.en ?? value.km ?? null;
  }
}
