import { SectionBlockType, SectionSettings } from "../section.entity";

export type SectionDataPayload = Record<string, unknown> | unknown[];

export interface LocalizedText {
    en: string;
    km?: string;
}

export interface PostLocalizedText {
    en?: string;
    km?: string;
}

export interface LocalizedDocumentFile {
    url: string;
    thumbnailUrl?: string | null;
}

export interface SectionBlock {
    id: number;
    type: SectionBlockType;
    title: LocalizedText;
    description?: LocalizedText | null;
    settings?: SectionSettings | null;
    orderIndex: number;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    posts?: SectionBlockPost[];
}

export interface SectionBlockPostAuthor {
    id: number;
    displayName: string;
    email: string;
}

export interface SectionBlockCategory {
    id: number;
    name: LocalizedText;
}

export interface SectionBlockPostPage {
    id: number;
    title: LocalizedText;
    slug: string;
}

export interface SectionBlockPost {
    id: number;
    title: PostLocalizedText;
    slug: string | null;
    description?: PostLocalizedText | null;
    content: Record<string, unknown> | null;
    status: string;
    coverImage?: string | null;
    document?: string | null;
    documentThumbnail?: string | null;
    documents?: {
        en?: LocalizedDocumentFile | null;
        km?: LocalizedDocumentFile | null;
    } | null;
    link?: string | null;
    createdAt: Date;
    updatedAt: Date;
    author: SectionBlockPostAuthor | null;
    category: SectionBlockCategory | null;
    page: SectionBlockPostPage | null;
}

export interface SectionResponse {
    page: LocalizedText;
    slug: string;
    blocks: SectionBlock[];
}
