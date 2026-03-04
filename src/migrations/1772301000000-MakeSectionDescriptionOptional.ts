import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeSectionDescriptionOptional1772301000000 implements MigrationInterface {
  name = 'MakeSectionDescriptionOptional1772301000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasSectionsTable = await queryRunner.hasTable('sections');
    if (!hasSectionsTable) {
      return;
    }

    await queryRunner.query(`ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "description" jsonb`);

    await queryRunner.query(`
      DO $$
      DECLARE
        description_data_type text;
      BEGIN
        SELECT data_type
        INTO description_data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sections'
          AND column_name = 'description'
        LIMIT 1;

        IF description_data_type IS NOT NULL AND description_data_type <> 'jsonb' THEN
          ALTER TABLE "sections"
          ALTER COLUMN "description" TYPE jsonb
          USING CASE
            WHEN "description" IS NULL THEN NULL
            ELSE jsonb_build_object('en', "description"::text)
          END;
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "sections" ALTER COLUMN "description" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasSectionsTable = await queryRunner.hasTable('sections');
    if (!hasSectionsTable) {
      return;
    }

    await queryRunner.query(`UPDATE "sections" SET "description" = jsonb_build_object('en', '') WHERE "description" IS NULL`);
    await queryRunner.query(`ALTER TABLE "sections" ALTER COLUMN "description" SET NOT NULL`);
  }
}
