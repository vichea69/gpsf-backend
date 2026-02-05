import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { WorkingGroupEntity, WorkingGroupStatus } from './working-group.entity';
import { CreateWorkingGroupDto } from './dto/create-working-group.dto';
import { UpdateWorkingGroupDto } from './dto/update-working-group.dto';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { PageEntity } from '@/modules/page/page.entity';

@Injectable()
export class WorkingGroupService {
  constructor(
    @InjectRepository(WorkingGroupEntity)
    private readonly workingGroupRepository: Repository<WorkingGroupEntity>,
    @InjectRepository(PageEntity)
    private readonly pageRepository: Repository<PageEntity>,
  ) {}

  async findAll(
    status?: WorkingGroupStatus,
    pageId?: number,
  ): Promise<{ items: WorkingGroupEntity[]; total: number }> {
    const options: FindManyOptions<WorkingGroupEntity> = {
      order: { orderIndex: 'ASC', createdAt: 'DESC' },
      relations: ['page', 'createdBy'],
    };

    if (status || typeof pageId === 'number') {
      const where: Record<string, unknown> = {};
      if (status) {
        where.status = status;
      }
      if (typeof pageId === 'number') {
        where.pageId = pageId;
      }
      options.where = where;
    }

    const [items, total] = await this.workingGroupRepository.findAndCount(options);
    return { items, total };
  }

  async findOne(id: number): Promise<WorkingGroupEntity> {
    const workingGroup = await this.workingGroupRepository.findOne({
      where: { id },
      relations: ['page', 'createdBy'],
    });

    if (!workingGroup) {
      throw new HttpException('Working group not found', HttpStatus.NOT_FOUND);
    }

    return workingGroup;
  }

  async create(user: UserEntity, dto: CreateWorkingGroupDto): Promise<WorkingGroupEntity> {
    if (!dto.title?.en?.trim()) {
      throw new HttpException('Title en is required', HttpStatus.BAD_REQUEST);
    }

    const workingGroup = this.workingGroupRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      iconUrl: dto.iconUrl ?? null,
      status: dto.status ?? WorkingGroupStatus.Draft,
      orderIndex: dto.orderIndex ?? 0,
      createdBy: user ?? null,
    });

    if (dto.pageId !== undefined && dto.pageId !== null) {
      const page = await this.getPageOrFail(dto.pageId);
      await this.ensurePageIsAvailable(page.id);
      workingGroup.page = page;
      workingGroup.pageId = page.id;
    }

    return this.workingGroupRepository.save(workingGroup);
  }

  async update(id: number, dto: UpdateWorkingGroupDto): Promise<WorkingGroupEntity> {
    const workingGroup = await this.findOne(id);

    if (dto.title !== undefined) {
      const mergedTitle = {
        ...(workingGroup.title ?? {}),
        ...dto.title,
      };
      if (!mergedTitle.en?.trim()) {
        throw new HttpException('Title en is required', HttpStatus.BAD_REQUEST);
      }
      workingGroup.title = mergedTitle;
    }

    if (dto.description !== undefined) {
      if (dto.description === null) {
        workingGroup.description = null;
      } else {
        const mergedDescription = {
          ...(workingGroup.description ?? {}),
          ...dto.description,
        };
        if (!mergedDescription.en?.trim()) {
          throw new HttpException('Description en is required', HttpStatus.BAD_REQUEST);
        }
        workingGroup.description = {
          en: mergedDescription.en,
          ...(mergedDescription.km !== undefined ? { km: mergedDescription.km } : {}),
        };
      }
    }

    if (dto.iconUrl !== undefined) {
      workingGroup.iconUrl = dto.iconUrl ?? null;
    }

    if (dto.status !== undefined) {
      workingGroup.status = dto.status;
    }

    if (dto.orderIndex !== undefined) {
      workingGroup.orderIndex = dto.orderIndex;
    }

    if (dto.pageId !== undefined) {
      if (dto.pageId === null) {
        workingGroup.page = null;
        workingGroup.pageId = null;
      } else {
        const page = await this.getPageOrFail(dto.pageId);
        await this.ensurePageIsAvailable(page.id, workingGroup.id);
        workingGroup.page = page;
        workingGroup.pageId = page.id;
      }
    }

    return this.workingGroupRepository.save(workingGroup);
  }

  async remove(id: number): Promise<void> {
    const workingGroup = await this.findOne(id);
    await this.workingGroupRepository.remove(workingGroup);
  }

  private async getPageOrFail(pageId: number): Promise<PageEntity> {
    const page = await this.pageRepository.findOne({ where: { id: pageId } });
    if (!page) {
      throw new HttpException('Page not found', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    return page;
  }

  private async ensurePageIsAvailable(pageId: number, currentWorkingGroupId?: number): Promise<void> {
    const existing = await this.workingGroupRepository.findOne({ where: { pageId } });
    if (existing && existing.id !== currentWorkingGroupId) {
      throw new HttpException(
        'This page is already linked to another working group',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }
}
