import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkingGroupEntity } from './working-group.entity';
import { WorkingGroupService } from './working-group.service';
import { WorkingGroupController } from './working-group.controller';
import { PageEntity } from '@/modules/page/page.entity';
import { RoleModule } from '@/modules/roles/role.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorkingGroupEntity, PageEntity]), RoleModule],
  controllers: [WorkingGroupController],
  providers: [WorkingGroupService],
  exports: [WorkingGroupService],
})
export class WorkingGroupModule {}
