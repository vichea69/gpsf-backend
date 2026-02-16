import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentAndLinkToPosts1771100000000 implements MigrationInterface {
  name = 'AddDocumentAndLinkToPosts1771100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "document" character varying(500)
    `);

    await queryRunner.query(`
      ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "link" character varying(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN IF EXISTS "link"
    `);

    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN IF EXISTS "document"
    `);
  }
}
