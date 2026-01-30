import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostSections1769526832959 implements MigrationInterface {
    name = 'AddPostSections1769526832959'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "post_sections" ("postsId" integer NOT NULL, "sectionsId" integer NOT NULL, CONSTRAINT "PK_8a8425407cf48b1a3be407c77e2" PRIMARY KEY ("postsId", "sectionsId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7d6c19dafc68b99636ba329d27" ON "post_sections" ("postsId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4d82f57c99fdc4f1a48d52b8ca" ON "post_sections" ("sectionsId") `);
        await queryRunner.query(`ALTER TABLE "posts" ADD "description" jsonb`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "description" jsonb`);
        await queryRunner.query(`ALTER TABLE "posts" ALTER COLUMN "title" TYPE jsonb USING jsonb_build_object('en', "title")`);
        await queryRunner.query(`ALTER TYPE "public"."sections_blocktype_enum" RENAME TO "sections_blocktype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."sections_blocktype_enum" AS ENUM('hero_banner', 'text_block', 'stats', 'benefits', 'post_list', 'work_groups')`);
        await queryRunner.query(`ALTER TABLE "sections" ALTER COLUMN "blockType" TYPE "public"."sections_blocktype_enum" USING "blockType"::"text"::"public"."sections_blocktype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."sections_blocktype_enum_old"`);
        await queryRunner.query(`ALTER TABLE "post_sections" ADD CONSTRAINT "FK_7d6c19dafc68b99636ba329d27d" FOREIGN KEY ("postsId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "post_sections" ADD CONSTRAINT "FK_4d82f57c99fdc4f1a48d52b8cac" FOREIGN KEY ("sectionsId") REFERENCES "sections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_sections" DROP CONSTRAINT "FK_4d82f57c99fdc4f1a48d52b8cac"`);
        await queryRunner.query(`ALTER TABLE "post_sections" DROP CONSTRAINT "FK_7d6c19dafc68b99636ba329d27d"`);
        await queryRunner.query(`CREATE TYPE "public"."sections_blocktype_enum_old" AS ENUM('hero_banner', 'stats', 'benefits', 'post_list', 'work_groups')`);
        await queryRunner.query(`ALTER TABLE "sections" ALTER COLUMN "blockType" TYPE "public"."sections_blocktype_enum_old" USING "blockType"::"text"::"public"."sections_blocktype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."sections_blocktype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."sections_blocktype_enum_old" RENAME TO "sections_blocktype_enum"`);
        await queryRunner.query(`ALTER TABLE "posts" ALTER COLUMN "title" TYPE character varying(200) USING ("title"->>'en')`);
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "description"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4d82f57c99fdc4f1a48d52b8ca"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7d6c19dafc68b99636ba329d27"`);
        await queryRunner.query(`DROP TABLE "post_sections"`);
    }

}
