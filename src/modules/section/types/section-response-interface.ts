export type SectionDataPayload = Record<string, unknown> | unknown[];

export interface SectionBlock {
    id: number;
    type: string;
    data: SectionDataPayload;
    title?: string | null;
    metadata?: SectionDataPayload | null;
    orderIndex: number;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface SectionResponse {
    page: string;
    slug: string;
    blocks: SectionBlock[];
}
