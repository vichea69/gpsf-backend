import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogoEntity } from '@/modules/logo/logo.entity';
import { UpdateLogoDto } from '@/modules/logo/dto/update-logo.dto';
import { UploadLogoDto } from '@/modules/logo/dto/upload-logo.dto';

@Injectable()
export class LogoService {
  constructor(
    @InjectRepository(LogoEntity)
    private readonly logoRepository: Repository<LogoEntity>,
  ) {}

  async getCurrent(): Promise<LogoEntity> {
    const [logo] = await this.logoRepository.find({ order: { createdAt: 'DESC' }, take: 1 });
    if (!logo) {
      throw new NotFoundException('Logo not found');
    }
    return logo;
  }

  async findAll(): Promise<LogoEntity[]> {
    return await this.logoRepository.find({ order: { id: 'ASC' } });
  }

  async getCurrentOrNull(): Promise<LogoEntity | null> {
    const [logo] = await this.logoRepository.find({ order: { createdAt: 'DESC' }, take: 1 });
    return logo ?? null;
  }

  async findById(id: number): Promise<LogoEntity> {
    const logo = await this.logoRepository.findOne({ where: { id } });
    if (!logo) throw new NotFoundException('Logo not found');
    return logo;
  }

  async create(dto: UploadLogoDto): Promise<LogoEntity> {
    const logo = this.logoRepository.create({
      url: this.toRelativePath(dto.url),
      title: dto.title ?? null,
      description: dto.description,
      link: dto.link,
    });
    return await this.logoRepository.save(logo);
  }

  async updateById(id: number, dto: UpdateLogoDto): Promise<LogoEntity> {
    const logo = await this.findById(id);

    if (dto.url !== undefined) logo.url = this.toRelativePath(dto.url);
    if (dto.title !== undefined) logo.title = dto.title ?? null;
    if (dto.description !== undefined) logo.description = dto.description;
    if (dto.link !== undefined) logo.link = dto.link;

    return await this.logoRepository.save(logo);
  }

  async removeById(id: number): Promise<void> {
    const logo = await this.findById(id);
    await this.logoRepository.remove(logo);
  }

  // Strip host from full URLs so we always store relative paths
  // e.g. "http://localhost:3001/uploads/img.png" → "/uploads/img.png"
  private toRelativePath(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      return url;
    }
  }
}
