import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSectionsAndWorkingGroupsToRolePermissionsResourceEnum1772305000000
    implements MigrationInterface
{
    name = 'AddSectionsAndWorkingGroupsToRolePermissionsResourceEnum1772305000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_type t
                    JOIN pg_enum e ON t.oid = e.enumtypid
                    WHERE t.typname = 'role_permissions_resource_enum'
                      AND e.enumlabel = 'sections'
                ) THEN
                    ALTER TYPE "role_permissions_resource_enum" ADD VALUE 'sections';
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_type t
                    JOIN pg_enum e ON t.oid = e.enumtypid
                    WHERE t.typname = 'role_permissions_resource_enum'
                      AND e.enumlabel = 'working-groups'
                ) THEN
                    ALTER TYPE "role_permissions_resource_enum" ADD VALUE 'working-groups';
                END IF;
            END
            $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "role_permissions" WHERE "resource" IN ('sections', 'working-groups');`);

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
}
