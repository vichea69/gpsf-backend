import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSectionsTable1769437939706 implements MigrationInterface {
    name = 'CreateSectionsTable1769437939706'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "testimonials" DROP CONSTRAINT "FK_testimonials_createdBy_users"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP CONSTRAINT "FK_c1a5f7dd8eb80fda8f341d5e9b7"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "data"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "metadata"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "categoryId"`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "settings" jsonb`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "blockType"`);
        await queryRunner.query(`CREATE TYPE "public"."sections_blocktype_enum" AS ENUM('hero_banner', 'stats', 'benefits', 'post_list', 'work_groups')`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "blockType" "public"."sections_blocktype_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "title" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "testimonials" ADD CONSTRAINT "FK_9bd567ac53298ca29a610eac34e" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "testimonials" DROP CONSTRAINT "FK_9bd567ac53298ca29a610eac34e"`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "title" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "blockType"`);
        await queryRunner.query(`DROP TYPE "public"."sections_blocktype_enum"`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "blockType" character varying(120) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "settings"`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "categoryId" integer`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "metadata" jsonb`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "data" jsonb NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sections" ADD CONSTRAINT "FK_c1a5f7dd8eb80fda8f341d5e9b7" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "testimonials" ADD CONSTRAINT "FK_testimonials_createdBy_users" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
