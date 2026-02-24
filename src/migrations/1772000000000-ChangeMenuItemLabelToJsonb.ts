import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeMenuItemLabelToJsonb1772000000000 implements MigrationInterface {
    name = 'ChangeMenuItemLabelToJsonb1772000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "menu_items" ADD COLUMN "label_jsonb" jsonb`);
        await queryRunner.query(`
            UPDATE "menu_items"
            SET "label_jsonb" = jsonb_build_object(
                'en',
                NULLIF(trim("label"), ''),
                'km',
                NULL
            )
        `);
        await queryRunner.query(`ALTER TABLE "menu_items" DROP COLUMN "label"`);
        await queryRunner.query(`ALTER TABLE "menu_items" RENAME COLUMN "label_jsonb" TO "label"`);
        await queryRunner.query(`ALTER TABLE "menu_items" ALTER COLUMN "label" SET NOT NULL`);
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
