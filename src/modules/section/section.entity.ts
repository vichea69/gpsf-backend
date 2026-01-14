import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PageEntity } from "@/modules/page/page.entity";
import type { SectionDataPayload } from "@/modules/section/types/section-response-interface";

@Entity({ name: "sections" })
export class SectionEntity {
    @PrimaryGeneratedColumn("increment")
    id: number;

    @ManyToOne(() => PageEntity, (page) => page.sections, { nullable: false, onDelete: "CASCADE" })
    page: PageEntity;

    @Column({ length: 120 })
    blockType: string;

    @Column({ length: 200, nullable: true })
    title?: string;

    @Column({ type: "jsonb" })
    data: SectionDataPayload;

    @Column({ type: "jsonb", nullable: true })
    metadata?: SectionDataPayload;

    @Column({ type: "int", default: 0 })
    orderIndex: number;

    @Column({ type: "boolean", default: true })
    enabled: boolean;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;
}
