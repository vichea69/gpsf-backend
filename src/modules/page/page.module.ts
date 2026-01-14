import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageEntity } from '@/modules/page/page.entity';
import { PageService } from '@/modules/page/page.service';
import { PageController } from '@/modules/page/page.controller';
import { RoleModule } from '@/modules/roles/role.module';
import { SectionModule } from '@/modules/section/section.module';

@Module({
  imports: [TypeOrmModule.forFeature([PageEntity]), RoleModule, forwardRef(() => SectionModule)],
  controllers: [PageController],
  providers: [PageService],
  exports: [PageService],
})
export class PageModule {}
