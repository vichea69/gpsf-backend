import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DeepPartial } from "typeorm";
import { SectionEntity } from "./section.entity";
import { SectionResponse, SectionBlock } from "./types/section-response-interface";
import { PageService } from "@/modules/page/page.service";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";

@Injectable()
export class SectionService {
    constructor(
        @InjectRepository(SectionEntity)
        private readonly sectionRepository: Repository<SectionEntity>,
        @Inject(forwardRef(() => PageService))
        private readonly pageService: PageService,
    ) {}

    async getSectionsForPage(slug: string, includeDrafts = false): Promise<SectionResponse> {
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

        return {
            page: page.title,
            slug: page.slug,
            blocks: sections.map((section) => this.toBlock(section)),
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
        const page = await this.pageService.findBySlug(dto.pageSlug, true);
        const section = this.sectionRepository.create({
            page,
            blockType: dto.blockType.trim(),
            title: dto.title?.trim() ?? null,
            data: dto.data ?? {},
            metadata: dto.metadata ?? null,
            orderIndex: dto.orderIndex ?? 0,
            enabled: dto.enabled ?? true,
        } as DeepPartial<SectionEntity>);

        return await this.sectionRepository.save(section);
    }

    async updateSection(id: number, dto: UpdateSectionDto): Promise<SectionEntity> {
        const section = await this.findSectionById(id);

        if (dto.pageSlug) {
            section.page = await this.pageService.findBySlug(dto.pageSlug, true);
        }
        if (dto.blockType) {
            section.blockType = dto.blockType;
        }
        if (dto.title !== undefined) {
            section.title = dto.title;
        }
        if (dto.data) {
            section.data = dto.data;
        }
        if (dto.metadata !== undefined) {
            section.metadata = dto.metadata;
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
            title: section.title ?? null,
            data: section.data ?? {},
            metadata: section.metadata ?? null,
            orderIndex: section.orderIndex,
            enabled: section.enabled,
            createdAt: section.createdAt,
            updatedAt: section.updatedAt,
        };
    }
}
