//Single Response Media
export interface MediaResponseInterface {
    id: number;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    thumbnailUrl?: string | null;
    mediaType: string;
    createdAt: Date;
}
