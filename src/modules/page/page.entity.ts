import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import {UserEntity} from '@/modules/users/entities/user.entity';
import { SectionEntity } from '@/modules/section/section.entity';

export enum PageStatus {
    Draft = 'draft',
    Published = 'published',
}

@Entity({name: 'pages'})
export class PageEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({type: 'jsonb'})
    title: {en: string; km?: string};

    @Column({unique: true, length: 240})
    slug: string;

    @Column({type: 'enum', enum: PageStatus, default: PageStatus.Draft})
    status: PageStatus;

    @Column({type: 'timestamp', nullable: true})
    publishedAt?: Date | null;

    @Column({type: 'jsonb', nullable: true})
    metaTitle?: {en: string; km?: string} | null;

    @Column({type: 'jsonb', nullable: true})
    metaDescription?: {en: string; km?: string} | null;

    @ManyToOne(() => UserEntity, {nullable: true, onDelete: 'SET NULL'})
    author?: UserEntity | null;

    @OneToMany(() => SectionEntity, (section) => section.page)
    sections?: SectionEntity[];

    sectionCount?: number;

    @CreateDateColumn({type: 'timestamp'})
    createdAt: Date;

    @UpdateDateColumn({type: 'timestamp'})
    updatedAt: Date;
}
