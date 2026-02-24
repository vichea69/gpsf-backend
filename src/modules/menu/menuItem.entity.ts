import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MenuEntity } from '@/modules/menu/menu.entity';

export interface MenuItemLabel {
  en?: string | null;
  km?: string | null;
}

@Entity({ name: 'menu_items' })
export class MenuItemEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => MenuEntity, (menu) => menu.items, { onDelete: 'CASCADE' })
  @Index()
  menu: MenuEntity;

  @ManyToOne(() => MenuItemEntity, (item) => item.children, { nullable: true, onDelete: 'SET NULL' })
  @Index()
  parent?: MenuItemEntity | null;

  @OneToMany(() => MenuItemEntity, (item) => item.parent)
  children?: MenuItemEntity[];

  @Column({ type: 'jsonb' })
  label: MenuItemLabel;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url?: string | null;

  @Index()
  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
