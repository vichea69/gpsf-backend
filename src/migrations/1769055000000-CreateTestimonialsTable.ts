import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTestimonialsTable1769055000000 implements MigrationInterface {
  name = 'CreateTestimonialsTable1769055000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'testimonials_status_enum'
            AND n.nspname = 'public'
        ) THEN
          CREATE TYPE "public"."testimonials_status_enum" AS ENUM('draft', 'published');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "testimonials" (
        "id" SERIAL NOT NULL,
        "quote" text NOT NULL,
        "authorName" character varying(120) NOT NULL,
        "authorRole" character varying(120),
        "company" character varying(160),
        "rating" integer,
        "avatarUrl" character varying(500),
        "status" "public"."testimonials_status_enum" NOT NULL DEFAULT 'draft',
        "orderIndex" integer NOT NULL DEFAULT 0,
        "createdById" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_testimonials_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_testimonials_createdBy_users'
            AND conrelid = 'testimonials'::regclass
        ) THEN
          ALTER TABLE "testimonials"
            ADD CONSTRAINT "FK_testimonials_createdBy_users"
            FOREIGN KEY ("createdById") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "testimonials" DROP CONSTRAINT IF EXISTS "FK_testimonials_createdBy_users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "testimonials"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."testimonials_status_enum"`);
  }
}
