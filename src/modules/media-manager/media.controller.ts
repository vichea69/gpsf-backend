import {
    Body,
    BadRequestException,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import {FilesInterceptor} from "@nestjs/platform-express";
import {MediaService} from "@/modules/media-manager/media.service";
import {MediasResponseInterface} from "@/modules/media-manager/types/medias-response-interface";
import { CreateMediaFolderDto } from '@/modules/media-manager/dto/create-media-folder.dto';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { PermissionsGuard } from '@/modules/roles/guards/permissions.guard';
import { Permissions } from '@/modules/roles/decorator/permissions.decorator';
import { Resource } from '@/modules/roles/enums/resource.enum';
import { Action } from '@/modules/roles/enums/actions.enum';


@Controller('media')
export class MediaController {
    constructor(private readonly mediaService: MediaService) {
    }

    //Get all Item in media
    @Get()
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Media, actions: [Action.Read] })
    findAll(
        @Query('page') page?: number,
        @Query('pageSize') pageSize?: number,
        @Query('folderId') folderId?: string,
    ): Promise<MediasResponseInterface> {
        const normalizedFolderId = this.parseFolderId(folderId, true);
        return this.mediaService.findAll(page, pageSize, normalizedFolderId).then((result) => ({
            success: true,
            message: 'OK',
            ...result,
        }));
    }

    @Get('folders')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Media, actions: [Action.Read] })
    listFolders() {
        return this.mediaService.listFolders().then((data) => ({
            success: true,
            message: 'OK',
            data,
        }));
    }

    @Get('folders/:id')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Media, actions: [Action.Read] })
    findFolderById(
        @Param('id', ParseIntPipe) id: number,
        @Query('page') page?: number,
        @Query('pageSize') pageSize?: number,
    ) {
        return this.mediaService.findFolderWithItems(id, page, pageSize).then((result) => ({
            success: true,
            message: 'OK',
            ...result,
        }));
    }

    @Post('folders')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Media, actions: [Action.Create] })
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    createFolder(@Body() dto: CreateMediaFolderDto) {
        return this.mediaService.createFolder(dto.name).then((data) => ({
            success: true,
            message: 'Folder created successfully',
            data,
        }));
    }

    @Delete('folders/:id')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Media, actions: [Action.Delete] })
    async deleteFolder(
        @Param('id', ParseIntPipe) id: number,
        @Query('force') force?: string,
    ) {
        const shouldForceDelete = String(force ?? '')
            .trim()
            .toLowerCase();
        const isForce = shouldForceDelete === 'true' || shouldForceDelete === '1';

        const result = await this.mediaService.deleteFolder(id, isForce);
        return {
            success: true,
            message: isForce
                ? `Folder deleted successfully (${result.deletedItemsCount} item(s) removed)`
                : 'Folder deleted successfully',
        };
    }

    //Get by id
    @Get(':id')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Media, actions: [Action.Read] })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.mediaService.findOne(id);
    }

    //Create media
    @Post('upload')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Media, actions: [Action.Create] })
    @UseInterceptors(FilesInterceptor('files', 20))
    uploadToRoot(
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        if (!files?.length) {
            throw new BadRequestException('At least one file is required');
        }
        return this.mediaService.upload(files, null);
    }

    //Create media in folder
    @Post('upload/folders/:folderId')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Media, actions: [Action.Create] })
    @UseInterceptors(FilesInterceptor('files', 20))
    uploadToFolder(
        @Param('folderId', ParseIntPipe) folderId: number,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        if (!files?.length) {
            throw new BadRequestException('At least one file is required');
        }
        return this.mediaService.upload(files, folderId);
    }

    //Delete something in media
    @Delete(':id')
    @UseGuards(AuthGuard, PermissionsGuard)
    @Permissions({ resource: Resource.Media, actions: [Action.Delete] })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.mediaService.remove(id);
    }

    private parseFolderId(
        value?: string | number,
        allowNull = false,
    ): number | null | undefined {
        if (value === undefined) {
            return undefined;
        }

        const raw = String(value).trim().toLowerCase();
        if (!raw || raw === 'root' || raw === 'null') {
            return allowNull ? null : undefined;
        }

        const parsed = Number(raw);
        if (!Number.isInteger(parsed) || parsed < 1) {
            throw new BadRequestException('folderId must be a positive integer');
        }

        return parsed;
    }
}
