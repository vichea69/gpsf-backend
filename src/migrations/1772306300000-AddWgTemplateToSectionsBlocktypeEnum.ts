import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWgTemplateToSectionsBlocktypeEnum1772306300000 implements MigrationInterface {
  name = 'AddWgTemplateToSectionsBlocktypeEnum1772306300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'sections_blocktype_enum'
            AND e.enumlabel = 'wg_template'
        ) THEN
          ALTER TYPE "public"."sections_blocktype_enum" ADD VALUE 'wg_template';
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Move rows away from the removed enum value before rebuilding the enum type.
    await queryRunner.query(`
      UPDATE "sections"
      SET "blockType" = 'text_block'::"public"."sections_blocktype_enum"
      WHERE "blockType"::text = 'wg_template';
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."sections_blocktype_enum" RENAME TO "sections_blocktype_enum_old";
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."sections_blocktype_enum" AS ENUM(
        'hero_banner',
        'text_block',
        'annual_reports',
        'issues_responses',
        'stats',
        'benefits',
        'post_list',
        'working_group_co_chairs',
        'announcement'
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "sections"
      ALTER COLUMN "blockType" TYPE "public"."sections_blocktype_enum"
      USING "blockType"::text::"public"."sections_blocktype_enum";
    `);

    await queryRunner.query(`
      DROP TYPE "public"."sections_blocktype_enum_old";
    `);
  }
}
