import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeMenuItemLabelToJsonb1772000000000 implements MigrationInterface {
    name = 'ChangeMenuItemLabelToJsonb1772000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "label_jsonb" jsonb`);
        await queryRunner.query(`
          DO $$
          DECLARE
            label_data_type text;
          BEGIN
            SELECT data_type
            INTO label_data_type
            FROM information_schema.columns
            WHERE table_name = 'menu_items' AND column_name = 'label'
            LIMIT 1;

            IF label_data_type IS NOT NULL AND label_data_type <> 'jsonb' THEN
              UPDATE "menu_items"
              SET "label_jsonb" = jsonb_build_object(
                'en',
                NULLIF(trim("label"), ''),
                'km',
                NULL
              )
              WHERE "label_jsonb" IS NULL;

              ALTER TABLE "menu_items" DROP COLUMN "label";
              ALTER TABLE "menu_items" RENAME COLUMN "label_jsonb" TO "label";
            ELSIF label_data_type IS NULL THEN
              ALTER TABLE "menu_items" RENAME COLUMN "label_jsonb" TO "label";
            END IF;
          END $$;
        `);
        await queryRunner.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'menu_items' AND column_name = 'label'
            ) THEN
              ALTER TABLE "menu_items" ALTER COLUMN "label" SET NOT NULL;
            END IF;
          END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "label_text" character varying(200)`);
        await queryRunner.query(`
            UPDATE "menu_items"
            SET "label_text" = LEFT(
                COALESCE(
                    NULLIF(trim("label"->>'en'), ''),
                    NULLIF(trim("label"->>'km'), ''),
                    ''
                ),
                200
            )
        `);
        await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN "label"`);
        await queryRunner.query(`ALTER TABLE "menu_items" RENAME COLUMN "label_text" TO "label"`);
        await queryRunner.query(`ALTER TABLE "menu_items" ALTER COLUMN "label" SET NOT NULL`);
    }
}
