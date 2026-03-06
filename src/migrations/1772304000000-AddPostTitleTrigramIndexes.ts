import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostTitleTrigramIndexes1772304000000 implements MigrationInterface {
  name = 'AddPostTitleTrigramIndexes1772304000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_posts_title_en_trgm"
      ON "posts" USING GIN (LOWER(("title" ->> 'en')) gin_trgm_ops)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_posts_title_km_trgm"
      ON "posts" USING GIN (LOWER(("title" ->> 'km')) gin_trgm_ops)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_posts_isFeatured_createdAt"
      ON "posts" ("isFeatured", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_posts_isFeatured_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_posts_title_km_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_posts_title_en_trgm"`);
  }
}
