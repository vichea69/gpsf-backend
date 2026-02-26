import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnouncementToSectionsBlocktypeEnum1772100000000 implements MigrationInterface {
    name = 'AddAnnouncementToSectionsBlocktypeEnum1772100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_type t
                    JOIN pg_namespace n ON n.oid = t.typnamespace
                    WHERE t.typname = 'sections_blocktype_enum' AND n.nspname = 'public'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM pg_type t
                    JOIN pg_enum e ON e.enumtypid = t.oid
                    JOIN pg_namespace n ON n.oid = t.typnamespace
                    WHERE t.typname = 'sections_blocktype_enum'
                      AND n.nspname = 'public'
                      AND e.enumlabel = 'announcement'
                ) THEN
                    ALTER TYPE "public"."sections_blocktype_enum" ADD VALUE 'announcement';
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            UPDATE "sections"
            SET "blockType" = 'text_block'::"public"."sections_blocktype_enum"
            WHERE "blockType"::text = 'anountment';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "sections"
            SET "blockType" = 'text_block'::"public"."sections_blocktype_enum"
            WHERE "blockType"::text IN ('announcement', 'anountment');
        `);

        await queryRunner.query(`ALTER TYPE "public"."sections_blocktype_enum" RENAME TO "sections_blocktype_enum_old";`);
        await queryRunner.query(
            `CREATE TYPE "public"."sections_blocktype_enum" AS ENUM('hero_banner', 'text_block', 'stats', 'benefits', 'post_list', 'work_groups')`,
        );
        await queryRunner.query(
            `ALTER TABLE "sections" ALTER COLUMN "blockType" TYPE "public"."sections_blocktype_enum" USING "blockType"::text::"public"."sections_blocktype_enum"`,
        );
        await queryRunner.query(`DROP TYPE "public"."sections_blocktype_enum_old"`);
    }
}
