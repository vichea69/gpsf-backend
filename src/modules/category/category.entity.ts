import { BeforeUpdate, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UserEntity } from "@/modules/users/entities/user.entity";

@Entity({ name: 'categories' })
export class CategoryEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;
  //Support english and khmer 
  @Column({ type: 'jsonb', unique: true })
  name: {
    en: string;
    km?: string;
  };
  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'" })
  description?: {
    en: string;
    km?: string;
  };

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  createdBy?: UserEntity | null;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}
