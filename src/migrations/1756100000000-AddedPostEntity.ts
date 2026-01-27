import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedPostEntity1756100000000 implements MigrationInterface {
  name = 'AddedPostEntity1756100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "posts" (
        "id" SERIAL NOT NULL,
        "title" character varying(200) NOT NULL,
        "content" text DEFAULT '',
        "imageUrl" character varying(500),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "authorId" integer,
        CONSTRAINT "PK_posts_id" PRIMARY KEY ("id")
      )`
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_posts_author_users'
            AND conrelid = 'posts'::regclass
        ) THEN
          ALTER TABLE "posts"
            ADD CONSTRAINT "FK_posts_author_users" FOREIGN KEY ("authorId")
            REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "FK_posts_author_users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "posts"`);
  }
}
