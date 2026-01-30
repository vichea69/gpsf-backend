import {
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToOne,
    ManyToMany,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { CategoryEntity } from '@/modules/category/category.entity';
import { PageEntity } from '@/modules/page/page.entity';
import { PostImageEntity } from '@/modules/post/post-image.entity';
import { SectionEntity } from '@/modules/section/section.entity';

export enum PostStatus {
    Draft = 'draft',
    Published = 'published'
}

@Entity({ name: 'posts' })
export class PostEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type:'jsonb' })
    title: { en: string; km?: string };

    @Column({ type: 'jsonb', nullable: true })
    description?: { en: string; km?: string };

    @Column({ unique: true, length: 240, nullable: true })
    slug: string;

    @Column({ type: 'jsonb', nullable: true })
    content?: Record<string, unknown> | null;

    @Column({ type: 'enum', enum: PostStatus, default: PostStatus.Draft })
    status: PostStatus;

    @OneToMany(() => PostImageEntity, (image) => image.post, {
        cascade: true,
        eager: false,
        orphanedRowAction: 'delete',
    })
    images?: PostImageEntity[];
    @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
    author?: UserEntity | null;

    @ManyToOne(() => CategoryEntity, { nullable: true, onDelete: 'SET NULL' })
    category?: CategoryEntity | null;

    @ManyToOne(() => PageEntity, { nullable: true, onDelete: 'SET NULL' })
    page?: PageEntity | null;

    @Column({ type: 'int', nullable: true })
    sectionId?: number | null;

    @ManyToOne(() => SectionEntity, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'sectionId' })
    section?: SectionEntity | null;

    @ManyToMany(() => SectionEntity, (section) => section.posts)
    @JoinTable({ name: 'post_sections' })
    sections?: SectionEntity[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @BeforeUpdate()
    updateTimestamp() {
        this.updatedAt = new Date();
    }
}
