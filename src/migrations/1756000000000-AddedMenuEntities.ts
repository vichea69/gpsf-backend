import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedMenuEntities1756000000000 implements MigrationInterface {
    name = 'AddedMenuEntities1756000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create menus table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "menus" (
                "id" SERIAL NOT NULL,
                "name" character varying(120) NOT NULL,
                "slug" character varying(140) NOT NULL,
                "description" text DEFAULT '',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_menus_name" UNIQUE ("name"),
                CONSTRAINT "UQ_menus_slug" UNIQUE ("slug"),
                CONSTRAINT "PK_menus_id" PRIMARY KEY ("id")
            )
        `);

        // Create menu_items table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "menu_items" (
                "id" SERIAL NOT NULL,
                "menuId" integer NOT NULL,
                "parentId" integer,
                "label" character varying(200) NOT NULL,
                "url" character varying(500),
                "pageSlug" character varying(240),
                "external" boolean NOT NULL DEFAULT false,
                "target" character varying(20),
                "icon" character varying(120),
                "orderIndex" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_menu_items_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_menu_items_menu" FOREIGN KEY ("menuId") REFERENCES "menus"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_menu_items_parent" FOREIGN KEY ("parentId") REFERENCES "menu_items"("id") ON DELETE SET NULL
            )
        `);

        // Helpful indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_menu_items_menuId" ON "menu_items" ("menuId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_menu_items_parentId" ON "menu_items" ("parentId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_menu_items_orderIndex" ON "menu_items" ("orderIndex")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_menu_items_orderIndex"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_menu_items_parentId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_menu_items_menuId"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "menu_items"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "menus"`);
    }
}

