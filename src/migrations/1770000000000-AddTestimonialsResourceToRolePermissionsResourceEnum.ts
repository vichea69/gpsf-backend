import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTestimonialsResourceToRolePermissionsResourceEnum1770000000000
    implements MigrationInterface
{
    name = 'AddTestimonialsResourceToRolePermissionsResourceEnum1770000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_type t
                    JOIN pg_enum e ON t.oid = e.enumtypid
                    WHERE t.typname = 'role_permissions_resource_enum'
                      AND e.enumlabel = 'testimonials'
                ) THEN
                    ALTER TYPE "role_permissions_resource_enum" ADD VALUE 'testimonials';
                END IF;
            END
            $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TYPE "role_permissions_resource_enum" RENAME TO "role_permissions_resource_enum_old";`,
        );
        await queryRunner.query(
            `CREATE TYPE "role_permissions_resource_enum" AS ENUM('logo', 'categories', 'pages', 'posts', 'menu', 'users', 'roles', 'articles', 'site-settings');`,
        );
        await queryRunner.query(
            `ALTER TABLE "role_permissions" ALTER COLUMN "resource" TYPE "role_permissions_resource_enum" USING "resource"::text::"role_permissions_resource_enum";`,
        );
        await queryRunner.query(`DROP TYPE "role_permissions_resource_enum_old";`);
    }
}
