import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnouncementToSectionsBlocktypeEnum1772100000000 implements MigrationInterface {
    name = 'AddAnnouncementToSectionsBlocktypeEnum1772100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."sections_blocktype_enum" RENAME TO "sections_blocktype_enum_old";`);
        await queryRunner.query(
            `CREATE TYPE "public"."sections_blocktype_enum" AS ENUM('hero_banner', 'text_block', 'stats', 'benefits', 'post_list', 'work_groups', 'announcement')`,
        );

        await queryRunner.query(
            `ALTER TABLE "sections" ALTER COLUMN "blockType" TYPE text USING "blockType"::text`,
        );
        await queryRunner.query(`
            UPDATE "sections"
            SET "blockType" = 'announcement'
            WHERE "blockType" = 'anountment';
        `);
        await queryRunner.query(
            `ALTER TABLE "sections" ALTER COLUMN "blockType" TYPE "public"."sections_blocktype_enum" USING "blockType"::text::"public"."sections_blocktype_enum"`,
        );
        await queryRunner.query(`DROP TYPE "public"."sections_blocktype_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "sections"
            SET "blockType" = 'text_block'
            WHERE "blockType" IN ('announcement', 'anountment');
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
