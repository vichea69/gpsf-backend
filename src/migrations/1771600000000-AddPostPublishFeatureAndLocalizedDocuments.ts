import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostPublishFeatureAndLocalizedDocuments1771600000000 implements MigrationInterface {
  name = 'AddPostPublishFeatureAndLocalizedDocuments1771600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP
    `);

    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "isFeatured" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "expiredAt" TIMESTAMP
    `);

    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "documentEn" character varying(500)
    `);

    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "documentKm" character varying(500)
    `);

    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "documentEnThumbnail" character varying(600)
    `);

    await queryRunner.query(`
      ALTER TABLE "posts"
      ADD COLUMN IF NOT EXISTS "documentKmThumbnail" character varying(600)
    `);

    await queryRunner.query(`
      UPDATE "posts"
      SET
        "documentEn" = COALESCE("documentEn", "document"),
        "documentEnThumbnail" = COALESCE("documentEnThumbnail", "documentThumbnail")
      WHERE "document" IS NOT NULL
         OR "documentThumbnail" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN IF EXISTS "documentKmThumbnail"
    `);

    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN IF EXISTS "documentEnThumbnail"
    `);

    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN IF EXISTS "documentKm"
    `);

    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN IF EXISTS "documentEn"
    `);

    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN IF EXISTS "expiredAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN IF EXISTS "isFeatured"
    `);

    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN IF EXISTS "publishedAt"
    `);
  }
}
