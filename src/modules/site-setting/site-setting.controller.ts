import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
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
import { SiteSettingService } from '@/modules/site-setting/site-setting.service';
import { CreateSiteSettingDto } from '@/modules/site-setting/dto/create-site-setting.dto';
import { UpdateSiteSettingDto } from '@/modules/site-setting/dto/update-site-setting.dto';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { PermissionsGuard } from '@/modules/roles/guards/permissions.guard';
import { Permissions } from '@/modules/roles/decorator/permissions.decorator';
import { Resource } from '@/modules/roles/enums/resource.enum';
import { Action } from '@/modules/roles/enums/actions.enum';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadedFilePayload } from '@/types/uploaded-file.type';

const SITE_LOGO_FIELDS: Array<{ name: string; maxCount: number }> = [
  { name: 'logo', maxCount: 1 },
  { name: 'siteLogo', maxCount: 1 },
  { name: 'SiteLogo', maxCount: 1 },
];

const ALLOWED_LOGO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]);

const SITE_LOGO_UPLOAD_OPTIONS = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    if (ALLOWED_LOGO_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new BadRequestException(`Unsupported logo file type: ${file.mimetype}`), false);
  },
};

@Controller('site-settings')
export class SiteSettingController {
  constructor(private readonly siteSettingService: SiteSettingService) {}

  @Get()
  findAll() {
    return this.siteSettingService.findAll();
  }

  @Get('current')
  findCurrent() {
    return this.siteSettingService.findCurrent();
  }

  @Get('current/contact-panel')
  findCurrentContactPanel() {
    return this.siteSettingService.findCurrentContactPanel();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.siteSettingService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.SiteSettings, actions: [Action.Create] })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  @UseInterceptors(
    FileFieldsInterceptor(
      SITE_LOGO_FIELDS,
      SITE_LOGO_UPLOAD_OPTIONS,
    ),
  )
  create(
    @Body() dto: CreateSiteSettingDto,
    @UploadedFiles()
    files: Partial<Record<'logo' | 'siteLogo' | 'SiteLogo', UploadedFilePayload[]>>,
  ) {
    const file = this.pickFile(files);
    return this.siteSettingService.create(dto, file);
  }

  @Put('current')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.SiteSettings, actions: [Action.Update] })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  @UseInterceptors(
    FileFieldsInterceptor(
      SITE_LOGO_FIELDS,
      SITE_LOGO_UPLOAD_OPTIONS,
    ),
  )
  updateCurrent(
    @Body() dto: UpdateSiteSettingDto,
    @UploadedFiles()
    files: Partial<Record<'logo' | 'siteLogo' | 'SiteLogo', UploadedFilePayload[]>>,
  ) {
    const file = this.pickFile(files);
    return this.siteSettingService.upsertCurrent(dto, file);
  }

  @Put(':id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.SiteSettings, actions: [Action.Update] })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  @UseInterceptors(
    FileFieldsInterceptor(
      SITE_LOGO_FIELDS,
      SITE_LOGO_UPLOAD_OPTIONS,
    ),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSiteSettingDto,
    @UploadedFiles()
    files: Partial<Record<'logo' | 'siteLogo' | 'SiteLogo', UploadedFilePayload[]>>,
  ) {
    const file = this.pickFile(files);
    return this.siteSettingService.update(id, dto, file);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions({ resource: Resource.SiteSettings, actions: [Action.Delete] })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.siteSettingService.remove(id);
  }

  private pickFile(
    files?: Partial<Record<'logo' | 'siteLogo' | 'SiteLogo', UploadedFilePayload[]>>,
  ): UploadedFilePayload | null {
    const raw =
      files?.logo?.[0] ??
      files?.siteLogo?.[0] ??
      files?.SiteLogo?.[0] ??
      null;
    if (!raw || !raw.buffer) return null;
    return { originalname: raw.originalname, buffer: raw.buffer, mimetype: raw.mimetype };
  }
}
