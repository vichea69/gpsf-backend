import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentThumbnailToPosts1771200000000 implements MigrationInterface {
  name = 'AddDocumentThumbnailToPosts1771200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "documentThumbnail" character varying(600)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN IF EXISTS "documentThumbnail"
    `);
  }
}
