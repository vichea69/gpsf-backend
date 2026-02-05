import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { PageEntity } from '@/modules/page/page.entity';

export enum WorkingGroupStatus {
  Draft = 'draft',
  Published = 'published',
}

@Entity({ name: 'working_groups' })
export class WorkingGroupEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'jsonb' })
  title: { en: string; km?: string };

  @Column({ type: 'jsonb', nullable: true })
  description?: { en: string; km?: string } | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  iconUrl?: string | null;

  @Column({ type: 'enum', enum: WorkingGroupStatus, default: WorkingGroupStatus.Draft })
  status: WorkingGroupStatus;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @Column({ type: 'int', nullable: true })
  pageId?: number | null;

  @OneToOne(() => PageEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pageId' })
  page?: PageEntity | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  createdBy?: UserEntity | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
