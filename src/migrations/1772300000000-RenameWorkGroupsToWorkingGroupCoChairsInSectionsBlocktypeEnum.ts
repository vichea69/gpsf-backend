import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameWorkGroupsToWorkingGroupCoChairsInSectionsBlocktypeEnum1772300000000
  implements MigrationInterface
{
  name = 'RenameWorkGroupsToWorkingGroupCoChairsInSectionsBlocktypeEnum1772300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
            WHEN "blockType"::text = 'work_groups' THEN 'working_group_co_chairs'::"public"."sections_blocktype_enum"
            WHEN "blockType"::text IN (
              'hero_banner',
              'text_block',
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
            'stats',
            'benefits',
            'post_list',
            'work_groups',
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
            WHEN "blockType"::text = 'working_group_co_chairs' THEN 'work_groups'::"public"."sections_blocktype_enum"
            WHEN "blockType"::text IN (
              'hero_banner',
              'text_block',
              'stats',
              'benefits',
              'post_list',
              'work_groups',
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
