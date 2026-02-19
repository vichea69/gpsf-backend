import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentsJsonbToPosts1771700000000 implements MigrationInterface {
  name = 'AddDocumentsJsonbToPosts1771700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "documents" jsonb
    `);

    await queryRunner.query(`
      UPDATE "posts"
      SET "documents" = NULLIF(
        jsonb_strip_nulls(
          jsonb_build_object(
            'en',
            CASE
              WHEN COALESCE(NULLIF(TRIM("documentEn"), ''), NULLIF(TRIM("document"), '')) IS NOT NULL
              THEN jsonb_build_object(
                'url', COALESCE(NULLIF(TRIM("documentEn"), ''), NULLIF(TRIM("document"), '')),
                'thumbnailUrl', COALESCE(NULLIF(TRIM("documentEnThumbnail"), ''), NULLIF(TRIM("documentThumbnail"), ''))
              )
              ELSE NULL
            END,
            'km',
            CASE
              WHEN NULLIF(TRIM("documentKm"), '') IS NOT NULL
              THEN jsonb_build_object(
                'url', NULLIF(TRIM("documentKm"), ''),
                'thumbnailUrl', NULLIF(TRIM("documentKmThumbnail"), '')
              )
              ELSE NULL
            END
          )
        ),
        '{}'::jsonb
      )
      WHERE "documents" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts"
      DROP COLUMN IF EXISTS "documents"
    `);
  }
}
