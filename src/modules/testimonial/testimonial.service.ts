import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestimonialEntity, TestimonialStatus } from './testimonial.entity';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { UserEntity } from '@/modules/users/entities/user.entity';

@Injectable()
export class TestimonialService {
  constructor(
    @InjectRepository(TestimonialEntity)
    private readonly testimonialRepository: Repository<TestimonialEntity>,
  ) {}

  async findAll(status?: TestimonialStatus): Promise<TestimonialEntity[]> {
    if (status) {
      return this.testimonialRepository.find({ where: { status }, order: { orderIndex: 'ASC', createdAt: 'DESC' } });
    }
    return this.testimonialRepository.find({ order: { orderIndex: 'ASC', createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<TestimonialEntity> {
    const testimonial = await this.testimonialRepository.findOne({ where: { id } });
    if (!testimonial) {
      throw new HttpException('Testimonial not found', HttpStatus.NOT_FOUND);
    }
    return testimonial;
  }

  async create(user: UserEntity, dto: CreateTestimonialDto): Promise<TestimonialEntity> {
    const testimonial = this.testimonialRepository.create({
      quote: dto.quote,
      title: dto.title ?? null,
      authorName: dto.authorName,
      authorRole: dto.authorRole ?? null,
      company: dto.company ?? null,
      rating: dto.rating ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      status: dto.status ?? TestimonialStatus.Draft,
      orderIndex: dto.orderIndex ?? 0,
      createdBy: user ?? null,
    });

    return this.testimonialRepository.save(testimonial);
  }

  async update(id: number, dto: UpdateTestimonialDto): Promise<TestimonialEntity> {
    const testimonial = await this.findOne(id);

    Object.assign(testimonial, {
      quote: dto.quote ?? testimonial.quote,
      title: dto.title ?? testimonial.title,
      authorName: dto.authorName ?? testimonial.authorName,
      authorRole: dto.authorRole ?? testimonial.authorRole,
      company: dto.company ?? testimonial.company,
      rating: dto.rating ?? testimonial.rating,
      avatarUrl: dto.avatarUrl ?? testimonial.avatarUrl,
      status: dto.status ?? testimonial.status,
      orderIndex: dto.orderIndex ?? testimonial.orderIndex,
    });

    return this.testimonialRepository.save(testimonial);
  }

  async remove(id: number): Promise<void> {
    const testimonial = await this.findOne(id);
    await this.testimonialRepository.remove(testimonial);
  }
}
