import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PageEntity } from '@/modules/page/page.entity';

export enum SectionBlockType {
  HERO_BANNER = 'hero_banner',
  STATS = 'stats',
  BENEFITS = 'benefits',
  POST_LIST = 'post_list',
  WORK_GROUPS = 'work_groups',
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

  @Column({ type: 'enum', enum: SectionBlockType })
  blockType: SectionBlockType;

  @Column({ type: 'jsonb'})
  title: { en: string; km?: string };

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
