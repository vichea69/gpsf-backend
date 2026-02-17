import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaFolders1771400000000 implements MigrationInterface {
  name = 'AddMediaFolders1771400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "media_folders" (
        "id" SERIAL NOT NULL,
        "name" character varying(120) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_media_folders_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_media_folders_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "folderId" integer
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_media_folderId" ON "media" ("folderId")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_media_folderId_media_folders_id'
            AND table_name = 'media'
        ) THEN
          ALTER TABLE "media"
            ADD CONSTRAINT "FK_media_folderId_media_folders_id"
            FOREIGN KEY ("folderId")
            REFERENCES "media_folders"("id")
            ON DELETE SET NULL
            ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "FK_media_folderId_media_folders_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_media_folderId"
    `);

    await queryRunner.query(`
      ALTER TABLE "media" DROP COLUMN IF EXISTS "folderId"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "media_folders"
    `);
  }
}
