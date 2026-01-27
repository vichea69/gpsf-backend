import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTestimonialsLocalization1769056000000 implements MigrationInterface {
  name = 'UpdateTestimonialsLocalization1769056000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "testimonials" ADD "title" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "testimonials" ALTER COLUMN "quote" TYPE jsonb USING jsonb_build_object('en', "quote")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "testimonials" ALTER COLUMN "quote" TYPE text USING "quote"->>'en'`);
    await queryRunner.query(`ALTER TABLE "testimonials" DROP COLUMN "title"`);
  }
}
