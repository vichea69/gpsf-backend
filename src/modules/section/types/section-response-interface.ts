import { SectionBlockType, SectionSettings } from "../section.entity";

export type SectionDataPayload = Record<string, unknown> | unknown[];

export interface LocalizedText {
    en: string;
    km?: string;
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
    title: LocalizedText;
    slug: string | null;
    description?: LocalizedText | null;
    content: Record<string, unknown> | null;
    status: string;
    coverImage?: string | null;
    document?: string | null;
    documentThumbnail?: string | null;
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
