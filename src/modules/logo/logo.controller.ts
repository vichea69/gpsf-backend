import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { LogoService } from '@/modules/logo/logo.service';
import { UpdateLogoDto } from '@/modules/logo/dto/update-logo.dto';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { PermissionsGuard } from '@/modules/roles/guards/permissions.guard';
import { Permissions } from '@/modules/roles/decorator/permissions.decorator';
import { Resource } from '@/modules/roles/enums/resource.enum';
import { Action } from '@/modules/roles/enums/actions.enum';
import { LogoResponseInterface } from '@/modules/logo/types/logoResponse.interface';
import { LogosResponseInterface } from '@/modules/logo/types/logosResponse.interface';
import { UploadLogoDto } from '@/modules/logo/dto/upload-logo.dto';

@Controller('logo')
export class LogoController {
  constructor(private readonly logoService: LogoService) {}

  @Get()
  async getAll(): Promise<LogosResponseInterface> {
    const logos = await this.logoService.findAll();
    return { logos, logosCount: logos.length };
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<LogoResponseInterface> {
    const logo = await this.logoService.findById(Number(id));
    return { logo };
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Logo, actions: [Action.Create] })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async create(@Body() dto: UploadLogoDto): Promise<LogoResponseInterface> {
    const logo = await this.logoService.create(dto);
    return { logo };
  }

  @Put(':id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Logo, actions: [Action.Update] })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLogoDto,
  ): Promise<LogoResponseInterface> {
    const logo = await this.logoService.updateById(Number(id), dto);
    return { logo };
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.Logo, actions: [Action.Delete] })
  async remove(@Param('id') id: string) {
    await this.logoService.removeById(Number(id));
    return { success: true };
  }
}
