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
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import { SectionResponse } from "./types/section-response-interface";
import { SectionService } from "./section.service";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";

@Controller("sections")
export class SectionController {
    constructor(private readonly sectionService: SectionService) {}

    @Get("page/:slug")
    async getSectionsByPage(@Param("slug") slug: string): Promise<SectionResponse> {
        return this.sectionService.getSectionsForPage(slug);
    }

    @Get()
    async listSections(@Query("pageSlug") pageSlug?: string) {
        const sections = await this.sectionService.listSections(pageSlug);
        return sections.map((section) => ({
            id: section.id,
            pageSlug: section.page.slug,
            blockType: section.blockType,
            title: section.title,
            data: section.data,
            metadata: section.metadata,
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
            pageSlug: section.page.slug,
            blockType: section.blockType,
            title: section.title,
            data: section.data,
            metadata: section.metadata,
            orderIndex: section.orderIndex,
            enabled: section.enabled,
            createdAt: section.createdAt,
            updatedAt: section.updatedAt,
        };
    }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    async createSection(@Body() dto: CreateSectionDto) {
        return await this.sectionService.createSection(dto);
    }

    @Put(":id")
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    async updateSection(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateSectionDto) {
        return await this.sectionService.updateSection(id, dto);
    }

    @Delete(":id")
    async deleteSection(@Param("id", ParseIntPipe) id: number) {
        await this.sectionService.deleteSection(id);
        return { message: "Section deleted" };
    }
}
