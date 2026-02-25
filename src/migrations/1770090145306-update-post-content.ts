import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePostContent1770090145306 implements MigrationInterface {
    name = 'UpdatePostContent1770090145306'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_type t
              JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE t.typname = 'work_groups_status_enum' AND n.nspname = 'public'
            ) THEN
              CREATE TYPE "public"."work_groups_status_enum" AS ENUM('draft', 'published');
            END IF;
          END $$;
        `);
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS "work_groups" (
            "id" SERIAL NOT NULL,
            "name" jsonb NOT NULL,
            "description" jsonb,
            "iconUrl" character varying(500),
            "status" "public"."work_groups_status_enum" NOT NULL DEFAULT 'draft',
            "orderIndex" integer NOT NULL DEFAULT '0',
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "createdById" integer,
            CONSTRAINT "PK_03d78b5f770090933d7da2d95e7" PRIMARY KEY ("id")
          )
        `);
        await queryRunner.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'FK_fd46039edbeef92828384fba796'
                AND conrelid = 'work_groups'::regclass
            ) THEN
              ALTER TABLE "work_groups"
              ADD CONSTRAINT "FK_fd46039edbeef92828384fba796"
              FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
            END IF;
          END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "work_groups" DROP CONSTRAINT IF EXISTS "FK_fd46039edbeef92828384fba796"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "work_groups"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."work_groups_status_enum"`);
    }

}
