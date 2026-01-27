import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { TestimonialService } from './testimonial.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { TestimonialStatus } from './testimonial.entity';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { PermissionsGuard } from '@/modules/roles/guards/permissions.guard';
import { Permissions } from '@/modules/roles/decorator/permissions.decorator';
import { Resource } from '@/modules/roles/enums/resource.enum';
import { Action } from '@/modules/roles/enums/actions.enum';
import { User } from '@/modules/auth/decorators/user.decorator';
import { UserEntity } from '@/modules/users/entities/user.entity';

@Controller('testimonials')
export class TestimonialController {
  constructor(private readonly testimonialService: TestimonialService) {}

  @Get()
  async findAll(@Query('status') status?: TestimonialStatus, @Query('lang') lang?: string) {
    const items = await this.testimonialService.findAll(status);
    const normalizedLang = this.normalizeLang(lang);
    return items.map((t) => ({
      id: t.id,
      title: this.pickLocalized(t.title, normalizedLang),
      quote: this.pickLocalized(t.quote, normalizedLang),
      authorName: t.authorName,
      authorRole: t.authorRole ?? null,
      company: t.company ?? null,
      rating: t.rating ?? null,
      avatarUrl: t.avatarUrl ?? null,
      status: t.status,
      orderIndex: t.orderIndex,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Query('lang') lang?: string) {
    const t = await this.testimonialService.findOne(id);
    const normalizedLang = this.normalizeLang(lang);
    return {
      id: t.id,
      title: this.pickLocalized(t.title, normalizedLang),
      quote: this.pickLocalized(t.quote, normalizedLang),
      authorName: t.authorName,
      authorRole: t.authorRole ?? null,
      company: t.company ?? null,
      rating: t.rating ?? null,
      avatarUrl: t.avatarUrl ?? null,
      status: t.status,
      orderIndex: t.orderIndex,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Testimonials, actions: [Action.Create] })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  create(@User() user: UserEntity, @Body() dto: CreateTestimonialDto) {
    return this.testimonialService.create(user, dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Testimonials, actions: [Action.Update] })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTestimonialDto) {
    return this.testimonialService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Testimonials, actions: [Action.Delete] })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.testimonialService.remove(id);
    return { message: 'Testimonial deleted' };
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
