import { BeforeUpdate, Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
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

    @Column({length: 200})
    title: string;

    @Column({unique: true, length: 240})
    slug: string;

    @Column({type: 'text'})
    content: string;

    @Column({type: 'enum', enum: PageStatus, default: PageStatus.Draft})
    status: PageStatus;

    @Column({type: 'timestamp', nullable: true})
    publishedAt?: Date | null;

    @ManyToOne(() => UserEntity, {nullable: true, onDelete: 'SET NULL'})
    author?: UserEntity | null;

    @OneToMany(() => SectionEntity, (section) => section.page)
    sections?: SectionEntity[];

    // Populated via loadRelationCountAndMap in list queries
    sectionCount?: number;

    // SEO fields
    @Column({type: 'varchar', length: 255, nullable: true})
    metaTitle?: string | null;

    @Column({type: 'varchar', length: 500, nullable: true})
    metaDescription?: string | null;

    @UpdateDateColumn({type: 'timestamp'})
    updatedAt: Date;

    @BeforeUpdate()
    updateTimestamp() {
        this.updatedAt = new Date();
    }
}
