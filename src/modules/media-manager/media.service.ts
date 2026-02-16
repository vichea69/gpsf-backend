import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import {StorageService} from "@/storage/storage.service";
import {InjectRepository} from "@nestjs/typeorm";
import {Media} from "@/modules/media-manager/media.entity";
import {Repository} from "typeorm";
import {MediaResponseInterface} from "@/modules/media-manager/types/media-response-interface";
import {detectMediaType} from "@/storage/helpers/media-type.helper";
import path from "node:path";
import * as fs from "node:fs";
import {MediasResponseInterface} from "@/modules/media-manager/types/medias-response-interface";

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
    ) {
    }

    //upload any type of file and support multiple upload
    async upload(
        files: Express.Multer.File[],
    ): Promise<MediaResponseInterface[]> {
        if (!files || files.length === 0) {
            return [];
        }

        const savedMedia: MediaResponseInterface[] = [];

        for (const file of files) {
            const media = await this.saveFile(file);
            savedMedia.push(media);
        }

        return savedMedia;
    }

    async saveFile(
        file: Express.Multer.File,
    ): Promise<MediaResponseInterface> {
        const {url} = await this.storageService.upload(file);
        const mediaType = detectMediaType(file.mimetype);
        const thumbnailUrl =
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
        });

        return this.mediaRepo.save(media);
    }

    //Get all Media (paginated)
    async findAll(page = 1, pageSize = 20): Promise<MediasResponseInterface> {
        const take = Math.min(Math.max(Number(pageSize) || 20, 1), 50);
        const current = Math.max(Number(page) || 1, 1);
        const skip = (current - 1) * take;

        const [items, total] = await this.mediaRepo.findAndCount({
            order: { createdAt: 'DESC' },
            take,
            skip,
        });

        return {
            page: current,
            pageSize: take,
            total,
            data: items,
        };
    }

    //Get by id or Get one
    async findOne(id: number) {
        const media = await this.mediaRepo.findOne({
            where: {id},
        });

        if (!media) {
            throw new NotFoundException(`Media with ID ${id} not found`);
        }

        return media;
    }

    async findByUrl(url: string): Promise<Media | null> {
        return this.mediaRepo.findOne({ where: { url } });
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

    //Replace File
    async replace(id: number, file: Express.Multer.File) {
        const media = await this.mediaRepo.findOne({where: {id}});

        if (!media) {
            throw new NotFoundException(`Media with ID ${id} not found`);
        }

        const oldUrl = media.url;
        const oldThumbnailUrl = media.thumbnailUrl;

        // Upload new file
        const {url} = await this.storageService.upload(file);
        const mediaType = detectMediaType(file.mimetype);
        const thumbnailUrl =
            mediaType === 'pdf'
                ? await this.createPdfThumbnail(url)
                : null;

        //Update DB record
        media.filename = file.originalname;
        media.originalName = file.originalname;
        media.mimeType = file.mimetype;
        media.size = file.size;
        media.url = url;
        media.thumbnailUrl = thumbnailUrl;
        media.mediaType = mediaType;
        media.storageDriver = 'local';

        await this.mediaRepo.save(media);

        if (media.storageDriver === 'local') {
            this.removeLocalFile(oldUrl);
            this.removeLocalFile(oldThumbnailUrl);
        }

        return {
            message: 'Media replaced successfully',
            data: media,
        };
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
