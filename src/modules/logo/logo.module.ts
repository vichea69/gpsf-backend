import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogoEntity } from '@/modules/logo/logo.entity';
import { LogoService } from '@/modules/logo/logo.service';
import { LogoController } from '@/modules/logo/logo.controller';
import { RoleModule } from '@/modules/roles/role.module';

@Module({
  imports: [TypeOrmModule.forFeature([LogoEntity]), RoleModule],
  controllers: [LogoController],
  providers: [LogoService],
  exports: [LogoService],
})
export class LogoModule {}
