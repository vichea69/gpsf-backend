import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import {StorageService} from "@/storage/storage.service";
import {InjectRepository} from "@nestjs/typeorm";
import {Media} from "@/modules/media-manager/media.entity";
import { IsNull, Repository } from "typeorm";
import {MediaResponseInterface} from "@/modules/media-manager/types/media-response-interface";
import {detectMediaType} from "@/storage/helpers/media-type.helper";
import path from "node:path";
import * as fs from "node:fs";
import {MediasResponseInterface} from "@/modules/media-manager/types/medias-response-interface";
import { MediaFolder } from '@/modules/media-manager/media-folder.entity';

type PdfToCairoOptions = {
    pngFile: boolean;
    singleFile: boolean;
    firstPageToConvert: number;
    lastPageToConvert: number;
};

interface PopplerContract {
    pdfToCairo(inputFile: string, outputFile: string, options: PdfToCairoOptions): Promise<unknown>;
}

@Injectable()
export class MediaService {
    constructor(
        private readonly storageService: StorageService,
        @InjectRepository(Media)
        private readonly mediaRepo: Repository<Media>,
        @InjectRepository(MediaFolder)
        private readonly folderRepo: Repository<MediaFolder>,
    ) {
    }

    //upload any type of file and support multiple upload
    async upload(
        files: Express.Multer.File[],
        folderId: number | null = null,
    ): Promise<MediaResponseInterface[]> {
        if (!files || files.length === 0) {
            return [];
        }

        const folder = folderId ? await this.findFolderById(folderId) : null;
        const savedMedia: MediaResponseInterface[] = [];

        for (const file of files) {
            const media = await this.saveFile(file, folder);
            savedMedia.push(media);
        }

        return savedMedia;
    }

    async saveFile(
        file: Express.Multer.File,
        folder: MediaFolder | null = null,
    ): Promise<MediaResponseInterface> {
        const {url} = await this.storageService.upload(file, folder?.name ?? undefined);
        let thumbnailUrl: string | null = null;

        try {
            const mediaType = detectMediaType(file.mimetype);
            thumbnailUrl =
                mediaType === 'pdf'
                    ? await this.createPdfThumbnail(url)
                    : null;

            const media = this.mediaRepo.create({
                filename: file.originalname,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                url,
                thumbnailUrl,
                mediaType,
                storageDriver: 'local',
                folderId: folder?.id ?? null,
                folder,
            });

            return this.mediaRepo.save(media);
        } catch (error) {
            this.removeLocalFile(url);
            this.removeLocalFile(thumbnailUrl);
            throw error;
        }
    }

    //Get all Media (paginated)
    async findAll(
        page = 1,
        pageSize = 20,
        folderId?: number | null,
    ): Promise<MediasResponseInterface> {
        const take = Math.min(Math.max(Number(pageSize) || 20, 1), 50);
        const current = Math.max(Number(page) || 1, 1);
        const skip = (current - 1) * take;
        // Default behavior: show root files when folderId is not provided.
        const targetFolderId = folderId === undefined ? null : folderId;
        const where =
            targetFolderId === null
                    ? { folderId: IsNull() }
                    : { folderId: targetFolderId };

        const [items, total] = await this.mediaRepo.findAndCount({
            where,
            relations: ['folder'],
            order: { createdAt: 'DESC' },
            take,
            skip,
        });

        const folders =
            targetFolderId === null
                ? await this.folderRepo.find({ order: { name: 'ASC' } })
                : undefined;

        return {
            page: current,
            pageSize: take,
            total,
            data: items,
            folders,
        };
    }

    //Get by id or Get one
    async findOne(id: number) {
        const media = await this.mediaRepo.findOne({
            where: {id},
            relations: ['folder'],
        });

        if (!media) {
            throw new NotFoundException(`Media with ID ${id} not found`);
        }

        return media;
    }

    async findByUrl(url: string): Promise<Media | null> {
        return this.mediaRepo.findOne({ where: { url } });
    }

    async listFolders(): Promise<MediaFolder[]> {
        return this.folderRepo.find({
            order: { name: 'ASC' },
        });
    }

    async findFolderWithItems(
        id: number,
        page = 1,
        pageSize = 20,
    ): Promise<{
        folder: MediaFolder;
        page: number;
        pageSize: number;
        total: number;
        data: Media[];
    }> {
        const folder = await this.findFolderById(id);
        const take = Math.min(Math.max(Number(pageSize) || 20, 1), 50);
        const current = Math.max(Number(page) || 1, 1);
        const skip = (current - 1) * take;

        const [items, total] = await this.mediaRepo.findAndCount({
            where: { folderId: folder.id },
            relations: ['folder'],
            order: { createdAt: 'DESC' },
            take,
            skip,
        });

        return {
            folder,
            page: current,
            pageSize: take,
            total,
            data: items,
        };
    }

    async createFolder(name: string): Promise<MediaFolder> {
        const normalizedName = this.normalizeFolderName(name);
        const existingFolder = await this.findFolderBySegment(this.toFolderSegment(normalizedName));
        if (existingFolder) {
            throw new BadRequestException('Folder name already exists');
        }

        const folder = this.folderRepo.create({
            name: normalizedName,
        });
        const savedFolder = await this.folderRepo.save(folder);

        try {
            this.ensureLocalFolderDirectory(savedFolder.name);
        } catch (error) {
            await this.folderRepo.delete(savedFolder.id);
            throw error;
        }

        return savedFolder;
    }

    async deleteFolder(
        id: number,
        force = false,
    ): Promise<{ deletedItemsCount: number }> {
        const folder = await this.findFolderById(id);
        const medias = await this.mediaRepo.find({ where: { folderId: folder.id } });
        const totalFiles = medias.length;

        if (totalFiles > 0 && !force) {
            const fileText = totalFiles > 1 ? 'files' : 'file';
            throw new BadRequestException(`Folder is not empty (${totalFiles} ${fileText})`);
        }

        if (totalFiles > 0 && force) {
            for (const media of medias) {
                if (media.storageDriver === 'local') {
                    this.removeLocalFile(media.url);
                    this.removeLocalFile(media.thumbnailUrl);
                }
            }
            await this.mediaRepo.remove(medias);
        }

        await this.folderRepo.remove(folder);
        this.removeLocalFolderDirectory(folder.name);

        return {
            deletedItemsCount: totalFiles,
        };
    }

    //Delete
    async remove(id: number) {
        const media = await this.mediaRepo.findOne({where: {id}});

        if (!media) {
            throw new NotFoundException(`Media with ID ${id} not found`);
        }
        if (media.storageDriver === 'local') {
            this.removeLocalFile(media.url);
            this.removeLocalFile(media.thumbnailUrl);
        }

        await this.mediaRepo.remove(media);

        return {
            message: 'Media deleted successfully',
        };
    }

    private async findFolderById(id: number): Promise<MediaFolder> {
        const folder = await this.folderRepo.findOne({ where: { id } });
        if (!folder) {
            throw new NotFoundException(`Folder with ID ${id} not found`);
        }
        return folder;
    }

    private async findFolderBySegment(segment: string): Promise<MediaFolder | null> {
        const folders = await this.folderRepo.find();
        return folders.find((folder) => this.toFolderSegment(folder.name) === segment) ?? null;
    }

    private normalizeFolderName(name: string): string {
        const normalizedName = name?.trim();
        if (!normalizedName) {
            throw new BadRequestException('Folder name is required');
        }
        if (!this.toFolderSegment(normalizedName)) {
            throw new BadRequestException('Folder name is invalid');
        }
        return normalizedName;
    }

    private ensureLocalFolderDirectory(folderName: string): void {
        const folderSegment = this.toFolderSegment(folderName);
        if (!folderSegment) {
            throw new BadRequestException('Folder name is invalid');
        }

        const uploadRoot = this.getUploadRoot();
        const folderPath = path.join(process.cwd(), uploadRoot, folderSegment);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
    }

    private removeLocalFolderDirectory(folderName: string): void {
        const folderSegment = this.toFolderSegment(folderName);
        if (!folderSegment) {
            return;
        }

        const uploadRoot = this.getUploadRoot();
        const uploadRootPath = path.resolve(process.cwd(), uploadRoot);
        const folderPath = path.resolve(uploadRootPath, folderSegment);

        // Safety check: allow remove only inside upload root.
        if (folderPath !== uploadRootPath && !folderPath.startsWith(`${uploadRootPath}${path.sep}`)) {
            return;
        }

        if (fs.existsSync(folderPath)) {
            fs.rmSync(folderPath, { recursive: true, force: true });
        }
    }

    private removeLocalFile(url?: string | null): void {
        if (!url) {
            return;
        }

        const filePath = this.toAbsolutePath(url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    private toAbsolutePath(url: string): string {
        return path.join(process.cwd(), url.replace(/^\/+/, ''));
    }

    private getUploadRoot(): string {
        return (process.env.LOCAL_UPLOAD_PATH || 'uploads').replace(/^\/+|\/+$/g, '');
    }

    private toFolderSegment(folderName: string | null): string {
        if (!folderName) {
            return '';
        }

        return folderName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    private async createPdfThumbnail(pdfUrl: string): Promise<string | null> {
        const absolutePdfPath = this.toAbsolutePath(pdfUrl);
        if (!fs.existsSync(absolutePdfPath)) {
            return null;
        }

        const uploadRoot = process.env.LOCAL_UPLOAD_PATH || 'uploads';
        const thumbnailRelativeDir = path.join(uploadRoot, 'thumbnails');
        const thumbnailAbsoluteDir = path.join(process.cwd(), thumbnailRelativeDir);
        if (!fs.existsSync(thumbnailAbsoluteDir)) {
            fs.mkdirSync(thumbnailAbsoluteDir, { recursive: true });
        }

        const uniqueBaseName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const outputPrefix = path.join(thumbnailAbsoluteDir, uniqueBaseName);
        const outputFilePath = `${outputPrefix}.png`;

        const poppler = this.createPopplerClient();
        await poppler.pdfToCairo(absolutePdfPath, outputPrefix, {
            pngFile: true,
            singleFile: true,
            firstPageToConvert: 1,
            lastPageToConvert: 1,
        });

        if (!fs.existsSync(outputFilePath)) {
            return null;
        }

        const normalizedDir = thumbnailRelativeDir.split(path.sep).join('/');
        return `/${normalizedDir}/${uniqueBaseName}.png`;
    }

    private createPopplerClient(): PopplerContract {
        try {
            const { Poppler } = require('node-poppler') as { Poppler: new () => PopplerContract };
            return new Poppler();
        } catch {
            throw new InternalServerErrorException(
                "PDF thumbnail requires 'node-poppler'. Install it with `npm install node-poppler` and ensure Poppler is installed on your server.",
            );
        }
    }

}
