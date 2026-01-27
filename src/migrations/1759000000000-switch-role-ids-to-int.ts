import { MigrationInterface, QueryRunner } from "typeorm";

export class SwitchRoleIdsToInt1759000000000 implements MigrationInterface {
    name = 'SwitchRoleIdsToInt1759000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        DO $$
        DECLARE
            constraint_name text;
        BEGIN
            FOR constraint_name IN
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'role_permissions'::regclass
                  AND confrelid = 'roles'::regclass
                  AND contype = 'f'
            LOOP
                EXECUTE 'ALTER TABLE "role_permissions" DROP CONSTRAINT ' || quote_ident(constraint_name);
            END LOOP;
        END $$;
        `);

        await queryRunner.query(`
        DO $$
        DECLARE
            constraint_name text;
        BEGIN
            SELECT conname INTO constraint_name
            FROM pg_constraint
            WHERE conrelid = 'roles'::regclass
              AND contype = 'p'
            LIMIT 1;

            IF constraint_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE "roles" DROP CONSTRAINT ' || quote_ident(constraint_name);
            END IF;
        END $$;
        `);

        await queryRunner.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'roles' AND column_name = 'id'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'roles' AND column_name = 'id_uuid'
            ) THEN
                ALTER TABLE "roles" RENAME COLUMN "id" TO "id_uuid";
            END IF;
        END $$;
        `);
        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "roles_id_seq";`);
        await queryRunner.query(`ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "id" integer NOT NULL DEFAULT nextval('"roles_id_seq"');`);
        await queryRunner.query(`
        DO $$
        BEGIN
            IF to_regclass('roles_id_seq') IS NOT NULL AND EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'roles' AND column_name = 'id'
            ) THEN
                ALTER SEQUENCE "roles_id_seq" OWNED BY "roles"."id";
            END IF;
        END $$;
        `);
        await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'PK_roles_id_int'
                  AND conrelid = 'roles'::regclass
            ) THEN
                ALTER TABLE "roles" ADD CONSTRAINT "PK_roles_id_int" PRIMARY KEY ("id");
            END IF;
        END $$;
        `);

        await queryRunner.query(`ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "role_id_new" integer;`);
        await queryRunner.query(`
        UPDATE "role_permissions" rp
        SET "role_id_new" = r."id"
        FROM "roles" r
        WHERE rp."role_id" = r."id_uuid";
        `);
        await queryRunner.query(`ALTER TABLE "role_permissions" ALTER COLUMN "role_id_new" SET NOT NULL;`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP COLUMN IF EXISTS "role_id";`);
        await queryRunner.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'role_permissions' AND column_name = 'role_id_new'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'role_permissions' AND column_name = 'role_id'
            ) THEN
                ALTER TABLE "role_permissions" RENAME COLUMN "role_id_new" TO "role_id";
            END IF;
        END $$;
        `);
        await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'FK_role_permissions_role_id_roles_int'
                  AND conrelid = 'role_permissions'::regclass
            ) THEN
                ALTER TABLE "role_permissions"
                ADD CONSTRAINT "FK_role_permissions_role_id_roles_int"
                FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;
            END IF;
        END $$;
        `);
        await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'UQ_role_permissions_role_id_resource_int'
                  AND conrelid = 'role_permissions'::regclass
            ) THEN
                ALTER TABLE "role_permissions"
                ADD CONSTRAINT "UQ_role_permissions_role_id_resource_int" UNIQUE ("role_id", "resource");
            END IF;
        END $$;
        `);

        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN IF EXISTS "id_uuid";`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "FK_role_permissions_role_id_roles_int";`);

        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        await queryRunner.query(`ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "id_uuid" uuid NOT NULL DEFAULT uuid_generate_v4();`);

        await queryRunner.query(`ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "role_id_old" uuid;`);
        await queryRunner.query(`
        UPDATE "role_permissions" rp
        SET "role_id_old" = r."id_uuid"
        FROM "roles" r
        WHERE rp."role_id" = r."id";
        `);
        await queryRunner.query(`ALTER TABLE "role_permissions" ALTER COLUMN "role_id_old" SET NOT NULL;`);

        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "PK_roles_id_int";`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN IF EXISTS "id";`);
        await queryRunner.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'roles' AND column_name = 'id_uuid'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'roles' AND column_name = 'id'
            ) THEN
                ALTER TABLE "roles" RENAME COLUMN "id_uuid" TO "id";
            END IF;
        END $$;
        `);
        await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();`);
        await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'PK_roles_id_uuid'
                  AND conrelid = 'roles'::regclass
            ) THEN
                ALTER TABLE "roles" ADD CONSTRAINT "PK_roles_id_uuid" PRIMARY KEY ("id");
            END IF;
        END $$;
        `);

        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "UQ_role_permissions_role_id_resource_int";`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP COLUMN IF EXISTS "role_id";`);
        await queryRunner.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'role_permissions' AND column_name = 'role_id_old'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'role_permissions' AND column_name = 'role_id'
            ) THEN
                ALTER TABLE "role_permissions" RENAME COLUMN "role_id_old" TO "role_id";
            END IF;
        END $$;
        `);
        await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'FK_role_permissions_role_id_roles_uuid'
                  AND conrelid = 'role_permissions'::regclass
            ) THEN
                ALTER TABLE "role_permissions"
                ADD CONSTRAINT "FK_role_permissions_role_id_roles_uuid"
                FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;
            END IF;
        END $$;
        `);
        await queryRunner.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'UQ_role_permissions_role_id_resource_uuid'
                  AND conrelid = 'role_permissions'::regclass
            ) THEN
                ALTER TABLE "role_permissions"
                ADD CONSTRAINT "UQ_role_permissions_role_id_resource_uuid" UNIQUE ("role_id", "resource");
            END IF;
        END $$;
        `);

        await queryRunner.query(`DROP SEQUENCE IF EXISTS "roles_id_seq";`);
    }
}
