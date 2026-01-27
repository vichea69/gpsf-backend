import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PostService } from '@/modules/post/post.service';
import { CreatePostDto } from '@/modules/post/dto/create-post.dto';
import { UpdatePostDto } from '@/modules/post/dto/update-post.dto';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { PermissionsGuard } from '@/modules/roles/guards/permissions.guard';
import { Permissions } from '@/modules/roles/decorator/permissions.decorator';
import { Resource } from '@/modules/roles/enums/resource.enum';
import { Action } from '@/modules/roles/enums/actions.enum';
import { User } from '@/modules/auth/decorators/user.decorator';
import { UserEntity } from '@/modules/users/entities/user.entity';
import type { UploadedFilePayload } from '@/types/uploaded-file.type';
import { PostEntity } from '@/modules/post/post.entity';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  findAll() {
    return this.postService.findAll().then((items) => items.map((post) => this.toPostResponse(post)));
  }

  @Get('category/:categoryId')
  findByCategory(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.postService
      .findByCategory(categoryId)
      .then((items) => items.map((post) => this.toPostResponse(post)));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postService.findOne(id).then((post) => this.toPostResponse(post));
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Posts, actions: [Action.Create] })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    }),
  )
  create(
    @User() user: UserEntity,
    @Body() dto: CreatePostDto,
    @UploadedFiles() files?: UploadedFilePayload[],
  ) {
    return this.postService.create(user, dto, files).then((post) => this.toPostResponse(post));
  }

  @Put(':id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Posts, actions: [Action.Update] })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
    @UploadedFiles() files?: UploadedFilePayload[],
  ) {
    return this.postService.update(id, dto, files).then((post) => this.toPostResponse(post));
  }

  @Delete(':postId/images/:imageId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Posts, actions: [Action.Delete] })
  @HttpCode(HttpStatus.OK)
  async removeImage(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    await this.postService.removeImage(postId, imageId);
    return { message: 'Image deleted successfully' };
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Posts, actions: [Action.Delete] })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.postService.remove(id);
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
