import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { CategoryService } from "@/modules/category/category.service";
import { CreateCategoryDto } from "@/modules/category/dto/create-category.dto";
import { UpdateCategoryDto } from "@/modules/category/dto/update-category.dto";
import { AuthGuard } from "@/modules/auth/guards/auth.guard";
import { PermissionsGuard } from "@/modules/roles/guards/permissions.guard";
import { Permissions } from "@/modules/roles/decorator/permissions.decorator";
import { Resource } from "@/modules/roles/enums/resource.enum";
import { Action } from "@/modules/roles/enums/actions.enum";
import { User } from "@/modules/auth/decorators/user.decorator";
import { UserEntity } from "@/modules/users/entities/user.entity";
import { CategoryEntity } from "@/modules/category/category.entity";
import { PostService } from "@/modules/post/post.service";
import { PostEntity } from "@/modules/post/post.entity";
import { CategoryRelationSummary } from "@/modules/category/category.service";


@Controller("categories")
export class CategoryController {
    constructor(
        private categoryService: CategoryService,
        private readonly postService: PostService,
    ) {}

    // Accept only 'en' or 'km' (case-insensitive); anything else is ignored.
    private normalizeLang(lang?: string): 'en' | 'km' | undefined {
        // No query provided, so keep the default behavior.
        if (!lang) {
            return undefined;
        }

        // Normalize to lowercase so EN/en/KM/km all work.
        const lower = lang.toLowerCase();
        // Accept English.
        if (lower === 'en') {
            return 'en';
        }

        // Accept Khmer.
        if (lower === 'km') {
            return 'km';
        }

        // Any other value is treated as "no language".
        return undefined;
    }

    private pickLocalizedField(
        value: { en?: string; km?: string } | null | undefined,
        lang?: 'en' | 'km',
    ): string | null {
        if (!value) return null;
        if (lang === 'km') return value.km ?? value.en ?? null;
        return value.en ?? value.km ?? null;
    }

    private toCategoryResponse(category: CategoryEntity, lang?: 'en' | 'km') {
        return this.toCategoryResponseWithSummary(category, lang);
    }

    private toCategoryResponseWithSummary(
        category: CategoryEntity,
        lang?: 'en' | 'km',
        summary?: CategoryRelationSummary,
    ) {
        const localized = lang === 'en' || lang === 'km';
        const relation = summary ?? {
            totalPosts: 0,
            totalPages: 0,
            totalSections: 0,
            pages: [],
            sections: [],
        };
        return {
            id: category.id,
            name: localized ? this.pickLocalizedField(category.name, lang) : category.name,
            description: localized ? this.pickLocalizedField(category.description, lang) : category.description,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
            createdBy: category.createdBy
                ? { id: category.createdBy.id, displayName: category.createdBy.username, email: category.createdBy.email }
                : null,
            relation,
        };
    }

    @Get()
    async findAll(@Query('lang') lang?: string) {
        const normalized = this.normalizeLang(lang);
        const categories = await this.categoryService.findAll();
        const summaryMap = await this.categoryService.getRelationSummaries(categories.map((c) => c.id));
        return categories.map((c) =>
            this.toCategoryResponseWithSummary(c, normalized, summaryMap.get(c.id)),
        );
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number, @Query('lang') lang?: string) {
        const normalized = this.normalizeLang(lang);
        const category = await this.categoryService.findOne(id);
        const summaryMap = await this.categoryService.getRelationSummaries([category.id]);
        return this.toCategoryResponseWithSummary(category, normalized, summaryMap.get(category.id));
    }

    @Get(':id/posts')
    findPostsByCategory(@Param('id', ParseIntPipe) id: number) {
        return this.postService
            .findByCategory(id)
            .then((items) => items.map((post) => this.toPostResponse(post)));
    }

    @Post()
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Categories, actions: [Action.Create] })
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    create(@User() user: UserEntity, @Body() dto: CreateCategoryDto) {
        return this.categoryService
            .create(user, dto)
            .then((c) => this.toCategoryResponse(c));
    }
    @Put(':id')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Categories, actions: [Action.Update] })
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
        return this.categoryService
            .update(id, dto)
            .then((c) => this.toCategoryResponse(c));
    }

    @Delete(':id')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Categories, actions: [Action.Delete] })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.categoryService.remove(id);
    }

    private toPostResponse(post: PostEntity) {
        const documents = post.documents ?? null;
        const documentEn = documents?.en ?? null;
        const documentKm = documents?.km ?? null;

        return {
            id: post.id,
            title: post.title,
            slug: post.slug,
            content: post.content,
            status: post.status,
            coverImage: post.coverImage ?? null,
            document: documentEn?.url ?? documentKm?.url ?? null,
            documentThumbnail: documentEn?.thumbnailUrl ?? documentKm?.thumbnailUrl ?? null,
            documents: {
                en: documentEn,
                km: documentKm,
            },
            link: post.link ?? null,
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
