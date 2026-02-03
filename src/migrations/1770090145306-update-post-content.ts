import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePostContent1770090145306 implements MigrationInterface {
    name = 'UpdatePostContent1770090145306'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."work_groups_status_enum" AS ENUM('draft', 'published')`);
        await queryRunner.query(`CREATE TABLE "work_groups" ("id" SERIAL NOT NULL, "name" jsonb NOT NULL, "description" jsonb, "iconUrl" character varying(500), "status" "public"."work_groups_status_enum" NOT NULL DEFAULT 'draft', "orderIndex" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, CONSTRAINT "PK_03d78b5f770090933d7da2d95e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "work_groups" ADD CONSTRAINT "FK_fd46039edbeef92828384fba796" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "work_groups" DROP CONSTRAINT "FK_fd46039edbeef92828384fba796"`);
        await queryRunner.query(`DROP TABLE "work_groups"`);
        await queryRunner.query(`DROP TYPE "public"."work_groups_status_enum"`);
    }

}
