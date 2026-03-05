import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIssuesResponsesToSectionsBlocktypeEnum1772303000000
  implements MigrationInterface
{
  name = 'AddIssuesResponsesToSectionsBlocktypeEnum1772303000000';

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
            AND e.enumlabel = 'issues_responses'
        ) THEN
          ALTER TYPE "public"."sections_blocktype_enum" ADD VALUE 'issues_responses';
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'sections_blocktype_enum' AND n.nspname = 'public'
        ) THEN
          ALTER TYPE "public"."sections_blocktype_enum" RENAME TO "sections_blocktype_enum_old";
          CREATE TYPE "public"."sections_blocktype_enum" AS ENUM(
            'hero_banner',
            'text_block',
            'annual_reports',
            'stats',
            'benefits',
            'post_list',
            'working_group_co_chairs',
            'announcement'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'sections' AND column_name = 'blockType'
        ) THEN
          ALTER TABLE "sections" ALTER COLUMN "blockType" DROP DEFAULT;
          ALTER TABLE "sections"
          ALTER COLUMN "blockType" TYPE "public"."sections_blocktype_enum"
          USING CASE
            WHEN "blockType"::text = 'issues_responses' THEN 'text_block'::"public"."sections_blocktype_enum"
            WHEN "blockType"::text IN (
              'hero_banner',
              'text_block',
              'annual_reports',
              'stats',
              'benefits',
              'post_list',
              'working_group_co_chairs',
              'announcement'
            ) THEN "blockType"::text::"public"."sections_blocktype_enum"
            ELSE 'hero_banner'::"public"."sections_blocktype_enum"
          END;
        END IF;
      END $$;
    `);

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."sections_blocktype_enum_old"`);
  }
}
