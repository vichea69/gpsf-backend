import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '@/modules/users/entities/user.entity';

export enum TestimonialStatus {
  Draft = 'draft',
  Published = 'published',
}

@Entity({ name: 'testimonials' })
export class TestimonialEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'jsonb' })
  quote: { en: string; km?: string };

  @Column({ type: 'jsonb', nullable: true })
  title?: { en: string; km?: string } | null;

  @Column({ type: 'jsonb' })
  authorName: { en: string; km?: string };

  @Column({ type: 'jsonb', nullable: true })
  authorRole?: { en: string; km?: string } | null;
  
  @Column({ type: 'varchar', length: 160, nullable: true })
  company?: string | null;

  @Column({ type: 'int', nullable: true })
  rating?: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string | null;

  @Column({ type: 'enum', enum: TestimonialStatus, default: TestimonialStatus.Draft })
  status: TestimonialStatus;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  createdBy?: UserEntity | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
