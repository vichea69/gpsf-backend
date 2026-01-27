import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRelationshipSectionAndCategory1768984612998 implements MigrationInterface {
    name = 'AddRelationshipSectionAndCategory1768984612998'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "categoryId" integer`);
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'FK_c1a5f7dd8eb80fda8f341d5e9b7'
                      AND conrelid = 'sections'::regclass
                ) THEN
                    ALTER TABLE "sections"
                    ADD CONSTRAINT "FK_c1a5f7dd8eb80fda8f341d5e9b7"
                    FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sections" DROP CONSTRAINT IF EXISTS "FK_c1a5f7dd8eb80fda8f341d5e9b7"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN IF EXISTS "categoryId"`);
    }

}
