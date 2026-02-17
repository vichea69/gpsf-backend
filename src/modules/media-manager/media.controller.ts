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
    UseInterceptors,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import {FilesInterceptor} from "@nestjs/platform-express";
import {MediaService} from "@/modules/media-manager/media.service";
import {MediasResponseInterface} from "@/modules/media-manager/types/medias-response-interface";
import { CreateMediaFolderDto } from '@/modules/media-manager/dto/create-media-folder.dto';


@Controller('media')
export class MediaController {
    constructor(private readonly mediaService: MediaService) {
    }

    //Get all Item in media
    @Get()
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
    listFolders() {
        return this.mediaService.listFolders().then((data) => ({
            success: true,
            message: 'OK',
            data,
        }));
    }

    @Get('folders/:id')
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
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    createFolder(@Body() dto: CreateMediaFolderDto) {
        return this.mediaService.createFolder(dto.name).then((data) => ({
            success: true,
            message: 'Folder created successfully',
            data,
        }));
    }

    @Delete('folders/:id')
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
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.mediaService.findOne(id);
    }

    //Create media
    @Post('upload')
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
