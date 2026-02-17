//Single Response Media
export interface MediaFolderResponseInterface {
    id: number;
    name: string;
}

export interface MediaResponseInterface {
    id: number;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    thumbnailUrl?: string | null;
    mediaType: string;
    storageDriver?: string;
    folderId?: number | null;
    folder?: MediaFolderResponseInterface | null;
    createdAt: Date;
}
