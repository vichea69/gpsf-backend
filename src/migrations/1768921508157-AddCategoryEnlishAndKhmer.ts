import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCategoryEnlishAndKhmer1768921508157 implements MigrationInterface {
    name = 'AddCategoryEnlishAndKhmer1768921508157'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "UQ_8b0be371d28245da6e4f4b61878"`);
        await queryRunner.query(`
            DO $$
            DECLARE
                name_type text;
            BEGIN
                SELECT data_type INTO name_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'categories'
                  AND column_name = 'name';

                IF name_type IS NULL THEN
                    ALTER TABLE "categories" ADD COLUMN "name" jsonb;
                    UPDATE "categories"
                    SET "name" = jsonb_build_object('en', '', 'km', '')
                    WHERE "name" IS NULL;
                ELSIF name_type <> 'jsonb' THEN
                    ALTER TABLE "categories" RENAME COLUMN "name" TO "name_text";
                    ALTER TABLE "categories" ADD COLUMN "name" jsonb;
                    UPDATE "categories"
                    SET "name" = jsonb_build_object('en', COALESCE("name_text", ''), 'km', '');
                    ALTER TABLE "categories" DROP COLUMN "name_text";
                ELSE
                    UPDATE "categories"
                    SET "name" = jsonb_build_object('en', '', 'km', '')
                    WHERE "name" IS NULL;
                END IF;

                ALTER TABLE "categories" ALTER COLUMN "name" SET NOT NULL;
            END $$;
        `);
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'UQ_8b0be371d28245da6e4f4b61878'
                      AND conrelid = 'categories'::regclass
                ) THEN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM (
                            SELECT "name", COUNT(*) AS dup_count
                            FROM "categories"
                            GROUP BY "name"
                            HAVING COUNT(*) > 1
                        ) AS dupes
                    ) THEN
                        ALTER TABLE "categories" ADD CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name");
                    END IF;
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$
            DECLARE
                desc_type text;
            BEGIN
                SELECT data_type INTO desc_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'categories'
                  AND column_name = 'description';

                IF desc_type IS NULL THEN
                    ALTER TABLE "categories" ADD COLUMN "description" jsonb DEFAULT '{}'::jsonb;
                ELSIF desc_type <> 'jsonb' THEN
                    ALTER TABLE "categories" RENAME COLUMN "description" TO "description_text";
                    ALTER TABLE "categories" ADD COLUMN "description" jsonb DEFAULT '{}'::jsonb;
                    UPDATE "categories"
                    SET "description" = CASE
                        WHEN "description_text" IS NULL OR "description_text" = '' THEN '{}'::jsonb
                        ELSE jsonb_build_object('en', "description_text", 'km', '')
                    END;
                    ALTER TABLE "categories" DROP COLUMN "description_text";
                ELSE
                    ALTER TABLE "categories" ALTER COLUMN "description" SET DEFAULT '{}'::jsonb;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            DECLARE
                desc_type text;
            BEGIN
                SELECT data_type INTO desc_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'categories'
                  AND column_name = 'description';

                IF desc_type = 'jsonb' THEN
                    ALTER TABLE "categories" ALTER COLUMN "description" DROP DEFAULT;
                    ALTER TABLE "categories" RENAME COLUMN "description" TO "description_jsonb";
                    ALTER TABLE "categories" ADD COLUMN "description" text DEFAULT '';
                    UPDATE "categories"
                    SET "description" = CASE
                        WHEN "description_jsonb" IS NULL THEN ''
                        ELSE "description_jsonb"::text
                    END;
                    ALTER TABLE "categories" DROP COLUMN "description_jsonb";
                END IF;
            END $$;
        `);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "UQ_8b0be371d28245da6e4f4b61878"`);
        await queryRunner.query(`
            DO $$
            DECLARE
                name_type text;
            BEGIN
                SELECT data_type INTO name_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'categories'
                  AND column_name = 'name';

                IF name_type = 'jsonb' THEN
                    ALTER TABLE "categories" RENAME COLUMN "name" TO "name_jsonb";
                    ALTER TABLE "categories" ADD COLUMN "name" character varying NOT NULL;
                    UPDATE "categories"
                    SET "name" = CASE
                        WHEN "name_jsonb" IS NULL THEN ''
                        ELSE "name_jsonb"::text
                    END;
                    ALTER TABLE "categories" DROP COLUMN "name_jsonb";
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'UQ_8b0be371d28245da6e4f4b61878'
                      AND conrelid = 'categories'::regclass
                ) THEN
                    ALTER TABLE "categories" ADD CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name");
                END IF;
            END $$;
        `);
    }

}
