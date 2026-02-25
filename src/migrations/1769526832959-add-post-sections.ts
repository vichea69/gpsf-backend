import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostSections1769526832959 implements MigrationInterface {
    name = 'AddPostSections1769526832959'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "post_sections" (
            "postsId" integer NOT NULL,
            "sectionsId" integer NOT NULL,
            CONSTRAINT "PK_8a8425407cf48b1a3be407c77e2" PRIMARY KEY ("postsId", "sectionsId")
          )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_7d6c19dafc68b99636ba329d27" ON "post_sections" ("postsId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_4d82f57c99fdc4f1a48d52b8ca" ON "post_sections" ("sectionsId")`);
        await queryRunner.query(`ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "description" jsonb`);
        await queryRunner.query(`ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "description" jsonb`);

        await queryRunner.query(`
          DO $$
          DECLARE
            posts_title_type text;
          BEGIN
            SELECT data_type
            INTO posts_title_type
            FROM information_schema.columns
            WHERE table_name = 'posts' AND column_name = 'title'
            LIMIT 1;

            IF posts_title_type IS NOT NULL AND posts_title_type <> 'jsonb' THEN
              ALTER TABLE "posts"
              ALTER COLUMN "title" TYPE jsonb
              USING CASE
                WHEN "title" IS NULL THEN jsonb_build_object('en', '')
                ELSE jsonb_build_object('en', "title"::text)
              END;
            END IF;
          END $$;
        `);

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
                AND e.enumlabel = 'text_block'
            ) THEN
              ALTER TYPE "public"."sections_blocktype_enum" RENAME TO "sections_blocktype_enum_old";
              CREATE TYPE "public"."sections_blocktype_enum" AS ENUM('hero_banner', 'text_block', 'stats', 'benefits', 'post_list', 'work_groups');
              ALTER TABLE "sections"
              ALTER COLUMN "blockType" TYPE "public"."sections_blocktype_enum"
              USING CASE
                WHEN "blockType"::text IN ('hero_banner', 'text_block', 'stats', 'benefits', 'post_list', 'work_groups')
                  THEN "blockType"::text::"public"."sections_blocktype_enum"
                ELSE 'hero_banner'::"public"."sections_blocktype_enum"
              END;
              DROP TYPE "public"."sections_blocktype_enum_old";
            END IF;
          END $$;
        `);

        await queryRunner.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'FK_7d6c19dafc68b99636ba329d27d'
                AND conrelid = 'post_sections'::regclass
            ) THEN
              ALTER TABLE "post_sections"
              ADD CONSTRAINT "FK_7d6c19dafc68b99636ba329d27d"
              FOREIGN KEY ("postsId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
            END IF;
          END $$;
        `);
        await queryRunner.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'FK_4d82f57c99fdc4f1a48d52b8cac'
                AND conrelid = 'post_sections'::regclass
            ) THEN
              ALTER TABLE "post_sections"
              ADD CONSTRAINT "FK_4d82f57c99fdc4f1a48d52b8cac"
              FOREIGN KEY ("sectionsId") REFERENCES "sections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
            END IF;
          END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_sections" DROP CONSTRAINT IF EXISTS "FK_4d82f57c99fdc4f1a48d52b8cac"`);
        await queryRunner.query(`ALTER TABLE "post_sections" DROP CONSTRAINT IF EXISTS "FK_7d6c19dafc68b99636ba329d27d"`);
        await queryRunner.query(`CREATE TYPE "public"."sections_blocktype_enum_old" AS ENUM('hero_banner', 'stats', 'benefits', 'post_list', 'work_groups')`);
        await queryRunner.query(`ALTER TABLE "sections" ALTER COLUMN "blockType" TYPE "public"."sections_blocktype_enum_old" USING "blockType"::"text"::"public"."sections_blocktype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."sections_blocktype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."sections_blocktype_enum_old" RENAME TO "sections_blocktype_enum"`);
        await queryRunner.query(`ALTER TABLE "posts" ALTER COLUMN "title" TYPE character varying(200) USING ("title"->>'en')`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN IF EXISTS "description"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN IF EXISTS "description"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_4d82f57c99fdc4f1a48d52b8ca"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_7d6c19dafc68b99636ba329d27"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "post_sections"`);
    }

}
