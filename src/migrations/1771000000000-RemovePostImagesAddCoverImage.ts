import { MigrationInterface, QueryRunner } from "typeorm";

export class RemovePostImagesAddCoverImage1771000000000 implements MigrationInterface {
  name = 'RemovePostImagesAddCoverImage1771000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "coverImage" character varying(500)
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'post_images'
        ) THEN
          UPDATE "posts" p
          SET "coverImage" = sub."url"
          FROM (
            SELECT DISTINCT ON ("postId") "postId", "url"
            FROM "post_images"
            ORDER BY "postId", "sortOrder", "id"
          ) AS sub
          WHERE sub."postId" = p."id"
            AND (p."coverImage" IS NULL OR p."coverImage" = '');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "post_images" DROP CONSTRAINT IF EXISTS "FK_post_images_posts"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "post_images"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post_images" (
        "id" SERIAL NOT NULL,
        "url" character varying(500) NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "postId" integer NOT NULL,
        CONSTRAINT "PK_post_images_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_post_images_posts'
            AND conrelid = 'post_images'::regclass
        ) THEN
          ALTER TABLE "post_images"
            ADD CONSTRAINT "FK_post_images_posts" FOREIGN KEY ("postId")
            REFERENCES "posts"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      INSERT INTO "post_images" ("url", "sortOrder", "postId")
      SELECT p."coverImage", 0, p."id"
      FROM "posts" p
      WHERE p."coverImage" IS NOT NULL
        AND p."coverImage" <> ''
        AND NOT EXISTS (
          SELECT 1 FROM "post_images" pi
          WHERE pi."postId" = p."id" AND pi."url" = p."coverImage"
        )
    `);

    await queryRunner.query(`
      ALTER TABLE "posts" DROP COLUMN IF EXISTS "coverImage"
    `);
  }
}
