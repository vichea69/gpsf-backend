import {
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { CategoryEntity } from '@/modules/category/category.entity';
import { PageEntity } from '@/modules/page/page.entity';
import { PostImageEntity } from '@/modules/post/post-image.entity';

export enum PostStatus {
    Draft = 'draft',
    Published = 'published'
}

@Entity({ name: 'posts' })
export class PostEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ length: 200 })
    title: string;

    @Column({ unique: true, length: 240, nullable: true })
    slug: string;
    //jsonb 
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

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @BeforeUpdate()
    updateTimestamp() {
        this.updatedAt = new Date();
    }
}
