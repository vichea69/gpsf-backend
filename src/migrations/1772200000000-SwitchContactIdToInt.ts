import { MigrationInterface, QueryRunner } from "typeorm";

export class SwitchContactIdToInt1772200000000 implements MigrationInterface {
    name = "SwitchContactIdToInt1772200000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasContactsTable = await queryRunner.hasTable("contacts");

        if (!hasContactsTable) {
            await queryRunner.query(`
              CREATE TABLE IF NOT EXISTS "contacts" (
                "id" SERIAL NOT NULL,
                "firstName" character varying(120) NOT NULL,
                "lastName" character varying(120) NOT NULL,
                "email" character varying(190) NOT NULL,
                "organisationName" character varying(190),
                "subject" character varying(220) NOT NULL,
                "message" text NOT NULL,
                "isRead" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_contacts_id_int" PRIMARY KEY ("id")
              )
            `);
            await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_contacts_email" ON "contacts" ("email")`);
            await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_contacts_subject" ON "contacts" ("subject")`);
            await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_contacts_isRead" ON "contacts" ("isRead")`);
            return;
        }

        const idColumn: Array<{ data_type: string; udt_name: string }> = await queryRunner.query(`
          SELECT data_type, udt_name
          FROM information_schema.columns
          WHERE table_name = 'contacts'
            AND column_name = 'id'
          LIMIT 1
        `);

        if (!idColumn.length) {
            return;
        }

        const isAlreadyInteger =
            idColumn[0].data_type === "integer" || idColumn[0].udt_name === "int4";

        if (isAlreadyInteger) {
            await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "contacts_id_seq"`);
            await queryRunner.query(`
              ALTER TABLE "contacts"
              ALTER COLUMN "id" SET DEFAULT nextval('"contacts_id_seq"')
            `);
            await queryRunner.query(`
              ALTER SEQUENCE "contacts_id_seq" OWNED BY "contacts"."id"
            `);
            await queryRunner.query(`
              DO $$
              DECLARE
                  max_id integer;
              BEGIN
                  SELECT MAX("id") INTO max_id FROM "contacts";
                  IF max_id IS NULL THEN
                      PERFORM setval('"contacts_id_seq"', 1, false);
                  ELSE
                      PERFORM setval('"contacts_id_seq"', max_id, true);
                  END IF;
              END $$;
            `);
            return;
        }

        const referencingForeignKeys: Array<{ conname: string }> = await queryRunner.query(`
          SELECT conname
          FROM pg_constraint
          WHERE contype = 'f'
            AND confrelid = 'contacts'::regclass
        `);

        if (referencingForeignKeys.length > 0) {
            const names = referencingForeignKeys.map((item) => item.conname).join(", ");
            throw new Error(
                `Cannot convert contacts.id to integer because foreign keys reference contacts: ${names}`,
            );
        }

        await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "contacts_id_seq"`);
        await queryRunner.query(`ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "id_int" integer`);
        await queryRunner.query(`
          UPDATE "contacts"
          SET "id_int" = nextval('"contacts_id_seq"')
          WHERE "id_int" IS NULL
        `);
        await queryRunner.query(`ALTER TABLE "contacts" ALTER COLUMN "id_int" SET NOT NULL`);
        await queryRunner.query(`
          ALTER TABLE "contacts"
          ALTER COLUMN "id_int" SET DEFAULT nextval('"contacts_id_seq"')
        `);
        await queryRunner.query(`
          ALTER SEQUENCE "contacts_id_seq" OWNED BY "contacts"."id_int"
        `);

        await queryRunner.query(`
          DO $$
          DECLARE
              pk_name text;
          BEGIN
              SELECT conname INTO pk_name
              FROM pg_constraint
              WHERE conrelid = 'contacts'::regclass
                AND contype = 'p'
              LIMIT 1;

              IF pk_name IS NOT NULL THEN
                  EXECUTE 'ALTER TABLE "contacts" DROP CONSTRAINT ' || quote_ident(pk_name);
              END IF;
          END $$;
        `);

        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "id"`);
        await queryRunner.query(`ALTER TABLE "contacts" RENAME COLUMN "id_int" TO "id"`);
        await queryRunner.query(`
          ALTER TABLE "contacts"
          ADD CONSTRAINT "PK_contacts_id_int" PRIMARY KEY ("id")
        `);

        await queryRunner.query(`
          DO $$
          DECLARE
              max_id integer;
          BEGIN
              SELECT MAX("id") INTO max_id FROM "contacts";
              IF max_id IS NULL THEN
                  PERFORM setval('"contacts_id_seq"', 1, false);
              ELSE
                  PERFORM setval('"contacts_id_seq"', max_id, true);
              END IF;
          END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasContactsTable = await queryRunner.hasTable("contacts");
        if (!hasContactsTable) {
            return;
        }

        const idColumn: Array<{ data_type: string; udt_name: string }> = await queryRunner.query(`
          SELECT data_type, udt_name
          FROM information_schema.columns
          WHERE table_name = 'contacts'
            AND column_name = 'id'
          LIMIT 1
        `);

        if (!idColumn.length) {
            return;
        }

        const isAlreadyUuid =
            idColumn[0].data_type === "uuid" || idColumn[0].udt_name === "uuid";

        if (isAlreadyUuid) {
            return;
        }

        const referencingForeignKeys: Array<{ conname: string }> = await queryRunner.query(`
          SELECT conname
          FROM pg_constraint
          WHERE contype = 'f'
            AND confrelid = 'contacts'::regclass
        `);

        if (referencingForeignKeys.length > 0) {
            const names = referencingForeignKeys.map((item) => item.conname).join(", ");
            throw new Error(
                `Cannot convert contacts.id to uuid because foreign keys reference contacts: ${names}`,
            );
        }

        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`
          ALTER TABLE "contacts"
          ADD COLUMN IF NOT EXISTS "id_uuid" uuid DEFAULT uuid_generate_v4()
        `);
        await queryRunner.query(`
          UPDATE "contacts"
          SET "id_uuid" = COALESCE("id_uuid", uuid_generate_v4())
        `);
        await queryRunner.query(`
          ALTER TABLE "contacts"
          ALTER COLUMN "id_uuid" SET NOT NULL
        `);

        await queryRunner.query(`
          DO $$
          DECLARE
              pk_name text;
          BEGIN
              SELECT conname INTO pk_name
              FROM pg_constraint
              WHERE conrelid = 'contacts'::regclass
                AND contype = 'p'
              LIMIT 1;

              IF pk_name IS NOT NULL THEN
                  EXECUTE 'ALTER TABLE "contacts" DROP CONSTRAINT ' || quote_ident(pk_name);
              END IF;
          END $$;
        `);

        await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "id"`);
        await queryRunner.query(`ALTER TABLE "contacts" RENAME COLUMN "id_uuid" TO "id"`);
        await queryRunner.query(`
          ALTER TABLE "contacts"
          ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()
        `);
        await queryRunner.query(`
          ALTER TABLE "contacts"
          ADD CONSTRAINT "PK_contacts_id_uuid" PRIMARY KEY ("id")
        `);

        await queryRunner.query(`DROP SEQUENCE IF EXISTS "contacts_id_seq"`);
    }
}
