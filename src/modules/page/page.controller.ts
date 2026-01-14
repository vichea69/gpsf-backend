import { Body, Controller, Delete, forwardRef, Get, Inject, Param, Post, Put, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
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
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('includeDrafts') includeDrafts?: string,
    @User() user?: UserEntity,
  ) {
    const current = Math.max(Number(page) || 1, 1);
    const size = Math.min(Math.max(Number(pageSize) || 10, 1), 50);
    // Always include both draft and published pages
    const { items, total } = await this.pageService.findAll(current, size, true);

    const data = items.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      content: p.content,
      publishedAt: p.publishedAt ?? null,
      updatedAt: p.updatedAt,
      sectionCount: p.sectionCount ?? 0,
      authorId: p.author
        ? { id: p.author.id, displayName: p.author.username, email: p.author.email }
        : null,
      seo: {
        metaTitle: p.metaTitle ?? null,
        metaDescription: p.metaDescription ?? null,
      },
    }));

    // Return minimal paginated shape
    return {
      page: current,
      pageSize: size,
      total,
      data,
    };
  }

  @Get(':slug')
  async findOne(
    @Param('slug') slug: string,
    @Query('includeDrafts') includeDrafts?: string,
    @User() user?: UserEntity,
  ) {
    const isPrivileged = user?.role === Role.Admin || user?.role === Role.Editor;
    const wantsDrafts = ['true','1','yes','y'].includes(String(includeDrafts).toLowerCase());
    // Allow drafts if:
    // - Admin/Editor (default, unless includeDrafts=false), or
    // - Client explicitly asks via includeDrafts=true (useful for previews)
    const canViewDrafts = (isPrivileged && (includeDrafts === undefined || wantsDrafts)) || (!isPrivileged && wantsDrafts);
    const p = await this.pageService.findBySlug(slug, canViewDrafts);
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      content: p.content,
      publishedAt: p.publishedAt ?? null,
      updatedAt: p.updatedAt,
      authorId: p.author ? { id: p.author.id, displayName: p.author.username, email: p.author.email } : null,
      seo: {
        metaTitle: p.metaTitle ?? null,
        metaDescription: p.metaDescription ?? null,
      },
    };
  }

  @Get(':slug/section')
  async getSections(
    @Param('slug') slug: string,
    @Query('includeDrafts') includeDrafts?: string,
    @User() user?: UserEntity,
  ) {
    const isPrivileged = user?.role === Role.Admin || user?.role === Role.Editor;
    const wantsDrafts = ['true','1','yes','y'].includes(String(includeDrafts).toLowerCase());
    const canViewDrafts = (isPrivileged && (includeDrafts === undefined || wantsDrafts)) || (!isPrivileged && wantsDrafts);

    return this.sectionService.getSectionsForPage(slug, canViewDrafts);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Pages, actions: [Action.Create] })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  create(@User() user: UserEntity, @Body() dto: CreatePageDto) {
    return this.pageService.create(user, dto);
  }

  @Put(':slug')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Pages, actions: [Action.Update] })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  update(@Param('slug') slug: string, @Body() dto: UpdatePageDto) {
    return this.pageService.update(slug, dto);
  }

  @Delete(':slug')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Pages, actions: [Action.Delete] })
  remove(@Param('slug') slug: string) {
    return this.pageService.remove(slug);
  }
}
