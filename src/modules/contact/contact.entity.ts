import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from "typeorm";

@Entity("contacts")
export class ContactEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 120 })
    firstName: string;

    @Column({ type: "varchar", length: 120 })
    lastName: string;

    @Index()
    @Column({ type: "varchar", length: 190 })
    email: string;

    @Column({ type: "varchar", length: 190, nullable: true })
    organisationName?: string;

    @Index()
    @Column({ type: "varchar", length: 220 })
    subject: string;

    @Column({ type: "text" })
    message: string;

    @Index()
    @Column({ type: "boolean", default: false })
    isRead: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}