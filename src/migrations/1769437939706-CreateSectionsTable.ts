import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSectionsTable1769437939706 implements MigrationInterface {
    name = 'CreateSectionsTable1769437939706'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "testimonials" DROP CONSTRAINT IF EXISTS "FK_testimonials_createdBy_users"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP CONSTRAINT IF EXISTS "FK_c1a5f7dd8eb80fda8f341d5e9b7"`);

        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN IF EXISTS "data"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN IF EXISTS "metadata"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN IF EXISTS "categoryId"`);
        await queryRunner.query(`ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "settings" jsonb`);

        await queryRunner.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_type t
              JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE t.typname = 'sections_blocktype_enum' AND n.nspname = 'public'
            ) THEN
              CREATE TYPE "public"."sections_blocktype_enum" AS ENUM('hero_banner', 'stats', 'benefits', 'post_list', 'work_groups');
            END IF;
          END $$;
        `);

        await queryRunner.query(`
          DO $$
          DECLARE
            block_type_udt text;
          BEGIN
            SELECT udt_name
            INTO block_type_udt
            FROM information_schema.columns
            WHERE table_name = 'sections' AND column_name = 'blockType'
            LIMIT 1;

            IF block_type_udt IS NULL THEN
              ALTER TABLE "sections"
              ADD COLUMN "blockType" "public"."sections_blocktype_enum" NOT NULL DEFAULT 'hero_banner';
              ALTER TABLE "sections" ALTER COLUMN "blockType" DROP DEFAULT;
            ELSIF block_type_udt <> 'sections_blocktype_enum' THEN
              ALTER TABLE "sections"
              ALTER COLUMN "blockType" TYPE "public"."sections_blocktype_enum"
              USING CASE
                WHEN "blockType" IS NULL OR trim("blockType"::text) = '' THEN 'hero_banner'::"public"."sections_blocktype_enum"
                WHEN "blockType"::text IN ('hero_banner', 'stats', 'benefits', 'post_list', 'work_groups')
                  THEN "blockType"::text::"public"."sections_blocktype_enum"
                ELSE 'hero_banner'::"public"."sections_blocktype_enum"
              END;
              ALTER TABLE "sections" ALTER COLUMN "blockType" SET NOT NULL;
            END IF;
          END $$;
        `);

        await queryRunner.query(`
          DO $$
          DECLARE
            title_data_type text;
          BEGIN
            SELECT data_type
            INTO title_data_type
            FROM information_schema.columns
            WHERE table_name = 'sections' AND column_name = 'title'
            LIMIT 1;

            IF title_data_type IS NULL THEN
              ALTER TABLE "sections"
              ADD COLUMN "title" jsonb NOT NULL DEFAULT jsonb_build_object('en', '');
            ELSIF title_data_type <> 'jsonb' THEN
              ALTER TABLE "sections"
              ALTER COLUMN "title" TYPE jsonb
              USING CASE
                WHEN "title" IS NULL THEN jsonb_build_object('en', '')
                ELSE jsonb_build_object('en', "title"::text)
              END;
            END IF;
          END $$;
        `);

        await queryRunner.query(`UPDATE "sections" SET "title" = jsonb_build_object('en', '') WHERE "title" IS NULL`);
        await queryRunner.query(`ALTER TABLE "sections" ALTER COLUMN "title" SET NOT NULL`);

        await queryRunner.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'testimonials' AND column_name = 'createdById'
            ) AND NOT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'FK_9bd567ac53298ca29a610eac34e'
                AND conrelid = 'testimonials'::regclass
            ) THEN
              ALTER TABLE "testimonials"
              ADD CONSTRAINT "FK_9bd567ac53298ca29a610eac34e"
              FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
            END IF;
          END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "testimonials" DROP CONSTRAINT "FK_9bd567ac53298ca29a610eac34e"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "title" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "blockType"`);
        await queryRunner.query(`DROP TYPE "public"."sections_blocktype_enum"`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "blockType" character varying(120) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "settings"`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "categoryId" integer`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "metadata" jsonb`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "data" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sections" ADD CONSTRAINT "FK_c1a5f7dd8eb80fda8f341d5e9b7" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "testimonials" ADD CONSTRAINT "FK_testimonials_createdBy_users" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
