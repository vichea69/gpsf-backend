import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncWorkingGroup1770176627609 implements MigrationInterface {
    name = 'SyncWorkingGroup1770176627609'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."working_groups_status_enum" AS ENUM('draft', 'published')`);
        await queryRunner.query(`CREATE TABLE "working_groups" ("id" SERIAL NOT NULL, "title" jsonb NOT NULL, "description" jsonb, "iconUrl" character varying(500), "status" "public"."working_groups_status_enum" NOT NULL DEFAULT 'draft', "orderIndex" integer NOT NULL DEFAULT '0', "pageId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdById" integer, CONSTRAINT "REL_f037f05bb4437a2b0d5d181b12" UNIQUE ("pageId"), CONSTRAINT "PK_95e6a3cace78635e0e7c85ddc98" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "working_groups" ADD CONSTRAINT "FK_f037f05bb4437a2b0d5d181b129" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "working_groups" ADD CONSTRAINT "FK_dcf6178d03f89b8b47914be622d" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "working_groups" DROP CONSTRAINT "FK_dcf6178d03f89b8b47914be622d"`);
        await queryRunner.query(`ALTER TABLE "working_groups" DROP CONSTRAINT "FK_f037f05bb4437a2b0d5d181b129"`);
        await queryRunner.query(`DROP TABLE "working_groups"`);
        await queryRunner.query(`DROP TYPE "public"."working_groups_status_enum"`);
    }

}
