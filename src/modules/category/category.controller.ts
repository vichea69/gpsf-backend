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
        const localized = lang === 'en' || lang === 'km';
        return {
            id: category.id,
            name: localized ? this.pickLocalizedField(category.name, lang) : category.name,
            description: localized ? this.pickLocalizedField(category.description, lang) : category.description,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
            createdBy: category.createdBy
                ? { id: category.createdBy.id, displayName: category.createdBy.username, email: category.createdBy.email }
                : null,
        };
    }

    @Get()
    findAll(@Query('lang') lang?: string) {
        const normalized = this.normalizeLang(lang);
        return this.categoryService.findAll().then(categories =>
            categories.map((c) => this.toCategoryResponse(c, normalized))
        );
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Query('lang') lang?: string) {
        const normalized = this.normalizeLang(lang);
        return this.categoryService.findOne(id).then((c) => this.toCategoryResponse(c, normalized));
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
        return this.categoryService.create(user, dto).then((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            createdBy: c.createdBy
                ? { id: c.createdBy.id, displayName: c.createdBy.username, email: c.createdBy.email }
                : null,
        }));
    }
    @Put(':id')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Categories, actions: [Action.Update] })
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
        return this.categoryService.update(id, dto).then((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            createdBy: c.createdBy
                ? { id: c.createdBy.id, displayName: c.createdBy.username, email: c.createdBy.email }
                : null,
        }));
    }

    @Delete(':id')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Categories, actions: [Action.Delete] })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.categoryService.remove(id);
    }

    private toPostResponse(post: PostEntity) {
        return {
            id: post.id,
            title: post.title,
            slug: post.slug,
            content: post.content,
            status: post.status,
            images:
                post.images?.map((image) => ({
                    id: image.id,
                    url: image.url,
                    sortOrder: image.sortOrder,
                })) ?? [],
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
