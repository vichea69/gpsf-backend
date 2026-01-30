import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostSectionId1769528962164 implements MigrationInterface {
    name = 'AddPostSectionId1769528962164'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" ADD "sectionId" integer`);
        await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "FK_4fb9df3a7239ce3532d080d3cc1" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_4fb9df3a7239ce3532d080d3cc1"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "sectionId"`);
    }

}
