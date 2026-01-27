import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTestimonialsAuthorLocalization1769056100000 implements MigrationInterface {
  name = 'UpdateTestimonialsAuthorLocalization1769056100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "testimonials" ALTER COLUMN "authorName" TYPE jsonb USING jsonb_build_object('en', "authorName")`,
    );
    await queryRunner.query(
      `ALTER TABLE "testimonials" ALTER COLUMN "authorRole" TYPE jsonb USING CASE WHEN "authorRole" IS NULL THEN NULL ELSE jsonb_build_object('en', "authorRole") END`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "testimonials" ALTER COLUMN "authorRole" TYPE character varying(120) USING "authorRole"->>'en'`,
    );
    await queryRunner.query(
      `ALTER TABLE "testimonials" ALTER COLUMN "authorName" TYPE character varying(120) USING "authorName"->>'en'`,
    );
  }
}
