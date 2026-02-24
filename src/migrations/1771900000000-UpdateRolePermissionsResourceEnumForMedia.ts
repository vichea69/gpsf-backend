import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateRolePermissionsResourceEnumForMedia1771900000000
    implements MigrationInterface
{
    name = 'UpdateRolePermissionsResourceEnumForMedia1771900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove obsolete permission rows before enum conversion.
        await queryRunner.query(`DELETE FROM "role_permissions" WHERE "resource" = 'articles';`);

        await queryRunner.query(
            `ALTER TYPE "role_permissions_resource_enum" RENAME TO "role_permissions_resource_enum_old";`,
        );
        await queryRunner.query(
            `CREATE TYPE "role_permissions_resource_enum" AS ENUM('logo', 'categories', 'pages', 'posts', 'media', 'menu', 'users', 'roles', 'site-settings', 'testimonials');`,
        );
        await queryRunner.query(
            `ALTER TABLE "role_permissions" ALTER COLUMN "resource" TYPE "role_permissions_resource_enum" USING "resource"::text::"role_permissions_resource_enum";`,
        );
        await queryRunner.query(`DROP TYPE "role_permissions_resource_enum_old";`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 'media' does not exist in previous enum version.
        await queryRunner.query(`DELETE FROM "role_permissions" WHERE "resource" = 'media';`);

        await queryRunner.query(
            `ALTER TYPE "role_permissions_resource_enum" RENAME TO "role_permissions_resource_enum_old";`,
        );
        await queryRunner.query(
            `CREATE TYPE "role_permissions_resource_enum" AS ENUM('logo', 'categories', 'pages', 'posts', 'menu', 'users', 'roles', 'articles', 'site-settings', 'testimonials');`,
        );
        await queryRunner.query(
            `ALTER TABLE "role_permissions" ALTER COLUMN "resource" TYPE "role_permissions_resource_enum" USING "resource"::text::"role_permissions_resource_enum";`,
        );
        await queryRunner.query(`DROP TYPE "role_permissions_resource_enum_old";`);
    }
}
