import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostSectionId1769528962164 implements MigrationInterface {
    name = 'AddPostSectionId1769528962164'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "sectionId" integer`);
        await queryRunner.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'FK_4fb9df3a7239ce3532d080d3cc1'
                AND conrelid = 'posts'::regclass
            ) THEN
              ALTER TABLE "posts"
              ADD CONSTRAINT "FK_4fb9df3a7239ce3532d080d3cc1"
              FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
            END IF;
          END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "FK_4fb9df3a7239ce3532d080d3cc1"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN IF EXISTS "sectionId"`);
    }

}
