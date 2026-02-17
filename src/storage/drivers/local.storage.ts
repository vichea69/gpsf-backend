import * as fs from 'fs';
import * as path from 'path';

export class LocalStorage {
    static async upload(file: Express.Multer.File, folderName?: string): Promise<string> {
        const uploadRoot = (process.env.LOCAL_UPLOAD_PATH || 'uploads').replace(/^\/+|\/+$/g, '');
        const folderSegment = this.toSafeFolderSegment(folderName);
        const relativeDir = folderSegment ? `${uploadRoot}/${folderSegment}` : uploadRoot;

        // Absolute path: project-root/uploads[/folder]
        const uploadDir = path.join(process.cwd(), relativeDir);

        // Create folder if not exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, {recursive: true});
        }

        // Unique filename with safe original name
        const safeOriginalName = this.toSafeFilename(file.originalname);
        const filename = `${Date.now()}-${safeOriginalName}`;
        const filepath = path.join(uploadDir, filename);

        // Save file
        fs.writeFileSync(filepath, file.buffer);

        // Public URL
        return `/${relativeDir}/${filename}`;
    }

    private static toSafeFilename(originalName: string): string {
        const base = path.basename(originalName || 'file');
        const ext = path.extname(base);
        const nameWithoutExt = path.basename(base, ext);

        const safeName = nameWithoutExt
            .replace(/[^a-zA-Z0-9_-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '') || 'file';

        const safeExt = ext
            .replace(/[^a-zA-Z0-9.]+/g, '')
            .slice(0, 10);

        return `${safeName}${safeExt}`;
    }

    private static toSafeFolderSegment(folderName?: string): string {
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
}
