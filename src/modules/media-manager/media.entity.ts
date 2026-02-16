import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn,} from 'typeorm';

@Entity('media')
export class Media {
    @PrimaryGeneratedColumn()
    id: number;

    // Stored filename (unique on disk)
    @Column()
    filename: string;

    // Original filename from user
    @Column()
    originalName: string;

    // image/png, image/jpeg, application/pdf, etc.
    @Column()
    mimeType: string;

    // File size in bytes
    @Column({type: 'bigint'})
    size: number;

    // Public URL (/uploads/xxx.png or https://r2...)
    @Column()
    url: string;

    // Optional generated preview for PDF files
    @Column({ type: 'varchar', length: 600, nullable: true })
    thumbnailUrl?: string | null;

    // image | video | pdf | file
    @Column()
    mediaType: string;

    // local | s3 | r2 (future-proof)
    @Column({default: 'local'})
    storageDriver: string;

    @CreateDateColumn()
    createdAt: Date;
}
