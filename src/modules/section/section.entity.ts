import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PageEntity } from '@/modules/page/page.entity';
import { PostEntity } from '@/modules/post/post.entity';

export enum SectionBlockType {
  HERO_BANNER = 'hero_banner',
  TEXT_BLOCK = 'text_block',
  ANNUAL_REPORTS = 'annual_reports',
  ISSUES_RESPONSES = 'issues_responses',
  STATS = 'stats',
  BENEFITS = 'benefits',
  POST_LIST = 'post_list',
  WORKING_GROUP_CO_CHAIRS = 'working_group_co_chairs',
  ANNOUNCEMENT = 'announcement',
}

export type SectionSettings = {
  categoryIds?: number[];      
  limit?: number;              
  sort?: 'manual' | 'latest'; 
};

@Entity({ name: 'sections' })
export class SectionEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int' })
  pageId: number;

  @ManyToOne(() => PageEntity, (page) => page.sections, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pageId' })
  page: PageEntity;

  @ManyToMany(() => PostEntity, (post) => post.sections)
  posts?: PostEntity[];

  @Column({ type: 'enum', enum: SectionBlockType })
  blockType: SectionBlockType;

  @Column({ type: 'jsonb'})
  title: { en: string; km?: string };

  @Column({ type: 'jsonb', nullable: true })
  description?: { en?: string; km?: string } | null;

  @Column({ type: 'jsonb', nullable: true })
  settings?: SectionSettings;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @CreateDateColumn({type: 'timestamp'})
  createdAt: Date;

  @UpdateDateColumn({type: 'timestamp'})
  updatedAt: Date;
}
