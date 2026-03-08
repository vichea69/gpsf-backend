import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import { SectionResponse } from "./types/section-response-interface";
import { SectionService } from "./section.service";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { AuthGuard } from "@/modules/auth/guards/auth.guard";
import { PermissionsGuard } from "@/modules/roles/guards/permissions.guard";
import { Permissions } from "@/modules/roles/decorator/permissions.decorator";
import { Resource } from "@/modules/roles/enums/resource.enum";
import { Action } from "@/modules/roles/enums/actions.enum";

@Controller("sections")
export class SectionController {
    constructor(private readonly sectionService: SectionService) {}

    @Get("page/:slug")
    async getSectionsByPage(
        @Param("slug") slug: string,
        @Query("includePosts") includePosts?: string,
    ): Promise<SectionResponse> {
        const wantsPosts =
            includePosts === undefined || ["true", "1", "yes", "y"].includes(String(includePosts).toLowerCase());
        return this.sectionService.getSectionsForPage(slug, false, wantsPosts);
    }

    @Get()
    async listSections(@Query("pageSlug") pageSlug?: string) {
        const sections = await this.sectionService.listSections(pageSlug);
        return sections.map((section) => ({
            id: section.id,
            pageId: section.pageId,
            pageSlug: section.page.slug,
            blockType: section.blockType,
            title: section.title,
            description: section.description ?? null,
            settings: section.settings ?? null,
            orderIndex: section.orderIndex,
            enabled: section.enabled,
            createdAt: section.createdAt,
            updatedAt: section.updatedAt,
        }));
    }

    @Get(":id")
    async getSection(@Param("id", ParseIntPipe) id: number) {
        const section = await this.sectionService.findSectionById(id);
        return {
            id: section.id,
            pageId: section.pageId,
            pageSlug: section.page.slug,
            blockType: section.blockType,
            title: section.title,
            description: section.description ?? null,
            settings: section.settings ?? null,
            orderIndex: section.orderIndex,
            enabled: section.enabled,
            createdAt: section.createdAt,
            updatedAt: section.updatedAt,
        };
    }

    @Post()
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Sections, actions: [Action.Create] })
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    async createSection(@Body() dto: CreateSectionDto) {
        return await this.sectionService.createSection(dto);
    }

    @Put(":id")
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Sections, actions: [Action.Update] })
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    async updateSection(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateSectionDto) {
        return await this.sectionService.updateSection(id, dto);
    }

    @Delete(":id")
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Sections, actions: [Action.Delete] })
    async deleteSection(@Param("id", ParseIntPipe) id: number) {
        await this.sectionService.deleteSection(id);
        return { message: "Section deleted" };
    }
}
