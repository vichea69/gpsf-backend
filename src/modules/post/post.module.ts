import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostEntity } from '@/modules/post/post.entity';
import { PostService } from '@/modules/post/post.service';
import { PostController } from '@/modules/post/post.controller';
import { R2Service } from '@/modules/post/r2.service';
import { CategoryEntity } from '@/modules/category/category.entity';
import { PageEntity } from '@/modules/page/page.entity';
import { PostImageEntity } from '@/modules/post/post-image.entity';
import { RoleModule } from '@/modules/roles/role.module';
import { SectionEntity } from '@/modules/section/section.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PostEntity, PostImageEntity, CategoryEntity, PageEntity, SectionEntity]), RoleModule],
  controllers: [PostController],
  providers: [PostService, R2Service],
  exports: [PostService],
})
export class PostModule {}
