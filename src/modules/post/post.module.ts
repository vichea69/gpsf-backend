import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostEntity } from '@/modules/post/post.entity';
import { PostService } from '@/modules/post/post.service';
import { PostController } from '@/modules/post/post.controller';
import { CategoryEntity } from '@/modules/category/category.entity';
import { PageEntity } from '@/modules/page/page.entity';
import { RoleModule } from '@/modules/roles/role.module';
import { SectionEntity } from '@/modules/section/section.entity';
import { MediaModule } from '@/modules/media-manager/media.module';

@Module({
  imports: [TypeOrmModule.forFeature([PostEntity, CategoryEntity, PageEntity, SectionEntity]), RoleModule, MediaModule],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
