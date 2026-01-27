import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangePostContentToJson1761000000000 implements MigrationInterface {
  name = 'ChangePostContentToJson1761000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        col_type text;
      BEGIN
        SELECT data_type INTO col_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'posts'
          AND column_name = 'content';

        IF col_type IS NULL THEN
          RETURN;
        END IF;

        IF col_type = 'jsonb' THEN
          ALTER TABLE "posts" ALTER COLUMN "content" DROP DEFAULT;
        ELSIF col_type = 'json' THEN
          ALTER TABLE "posts" ALTER COLUMN "content" DROP DEFAULT;
          ALTER TABLE "posts"
            ALTER COLUMN "content" TYPE jsonb
            USING "content"::jsonb;
        ELSE
          ALTER TABLE "posts" ALTER COLUMN "content" DROP DEFAULT;
          ALTER TABLE "posts"
            ALTER COLUMN "content" TYPE jsonb
            USING CASE
              WHEN "content" IS NULL OR "content" = '' THEN NULL
              ELSE to_jsonb("content")
            END;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        col_type text;
      BEGIN
        SELECT data_type INTO col_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'posts'
          AND column_name = 'content';

        IF col_type IS NULL THEN
          RETURN;
        END IF;

        IF col_type IN ('jsonb', 'json') THEN
          ALTER TABLE "posts"
            ALTER COLUMN "content" TYPE text
            USING CASE
              WHEN "content" IS NULL THEN NULL
              ELSE "content"::text
            END;
          ALTER TABLE "posts" ALTER COLUMN "content" SET DEFAULT '';
        END IF;
      END $$;
    `);
  }
}
