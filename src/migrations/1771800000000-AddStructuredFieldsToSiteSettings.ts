import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStructuredFieldsToSiteSettings1771800000000 implements MigrationInterface {
  name = 'AddStructuredFieldsToSiteSettings1771800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "title" jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "description" jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "logo" character varying(600)
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "footerBackground" character varying(600)
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "address" jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "contact" jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "openTime" jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "socialLinks" jsonb
    `);

    await queryRunner.query(`
      UPDATE "site_settings"
      SET "title" = jsonb_build_object('en', NULLIF(TRIM("siteName"), ''))
      WHERE "title" IS NULL
        AND NULLIF(TRIM("siteName"), '') IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "site_settings"
      SET "description" = jsonb_build_object('en', NULLIF(TRIM("siteDescription"), ''))
      WHERE "description" IS NULL
        AND NULLIF(TRIM("siteDescription"), '') IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "site_settings"
      SET "logo" = NULLIF(TRIM("siteLogo"), '')
      WHERE "logo" IS NULL
        AND NULLIF(TRIM("siteLogo"), '') IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "site_settings"
      SET "address" = jsonb_build_object('en', NULLIF(TRIM("contactAddress"), ''))
      WHERE "address" IS NULL
        AND NULLIF(TRIM("contactAddress"), '') IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "site_settings"
      SET "openTime" = jsonb_build_object('en', NULLIF(TRIM("contactOpenTime"), ''))
      WHERE "openTime" IS NULL
        AND NULLIF(TRIM("contactOpenTime"), '') IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "site_settings"
      SET "contact" = jsonb_build_object(
        'en',
        jsonb_strip_nulls(
          jsonb_build_object(
            'phones', to_jsonb(array_remove(ARRAY[
              NULLIF(TRIM("contactPhonePrimary"), ''),
              NULLIF(TRIM("contactPhoneSecondary"), ''),
              NULLIF(TRIM("sitePhone"), '')
            ]::text[], NULL::text)),
            'desks', NULLIF(
              ('[]'::jsonb
                || CASE WHEN NULLIF(TRIM("contactEmailGeneral"), '') IS NOT NULL OR NULLIF(TRIM("contactEmailInfo"), '') IS NOT NULL
                    THEN jsonb_build_array(jsonb_build_object(
                      'title', 'General',
                      'emails', to_jsonb(array_remove(ARRAY[
                        NULLIF(TRIM("contactEmailGeneral"), ''),
                        NULLIF(TRIM("contactEmailInfo"), '')
                      ]::text[], NULL::text))
                    ))
                    ELSE '[]'::jsonb
                END
                || CASE WHEN NULLIF(TRIM("contactEmailChinaDesk"), '') IS NOT NULL
                    THEN jsonb_build_array(jsonb_build_object(
                      'title', 'China Desk',
                      'emails', to_jsonb(ARRAY[NULLIF(TRIM("contactEmailChinaDesk"), '')]::text[])
                    ))
                    ELSE '[]'::jsonb
                END
                || CASE WHEN NULLIF(TRIM("contactEmailEuDesk"), '') IS NOT NULL
                    THEN jsonb_build_array(jsonb_build_object(
                      'title', 'EU Desk',
                      'emails', to_jsonb(ARRAY[NULLIF(TRIM("contactEmailEuDesk"), '')]::text[])
                    ))
                    ELSE '[]'::jsonb
                END
                || CASE WHEN NULLIF(TRIM("contactEmailJapanDesk"), '') IS NOT NULL
                    THEN jsonb_build_array(jsonb_build_object(
                      'title', 'Japan Desk',
                      'emails', to_jsonb(ARRAY[NULLIF(TRIM("contactEmailJapanDesk"), '')]::text[])
                    ))
                    ELSE '[]'::jsonb
                END
                || CASE WHEN NULLIF(TRIM("contactEmailKoreaDesk"), '') IS NOT NULL
                    THEN jsonb_build_array(jsonb_build_object(
                      'title', 'Korea Desk',
                      'emails', to_jsonb(ARRAY[NULLIF(TRIM("contactEmailKoreaDesk"), '')]::text[])
                    ))
                    ELSE '[]'::jsonb
                END
              ),
              '[]'::jsonb
            )
          )
        )
      )
      WHERE "contact" IS NULL
        AND (
          NULLIF(TRIM("contactPhonePrimary"), '') IS NOT NULL
          OR NULLIF(TRIM("contactPhoneSecondary"), '') IS NOT NULL
          OR NULLIF(TRIM("sitePhone"), '') IS NOT NULL
          OR NULLIF(TRIM("contactEmailGeneral"), '') IS NOT NULL
          OR NULLIF(TRIM("contactEmailInfo"), '') IS NOT NULL
          OR NULLIF(TRIM("contactEmailChinaDesk"), '') IS NOT NULL
          OR NULLIF(TRIM("contactEmailEuDesk"), '') IS NOT NULL
          OR NULLIF(TRIM("contactEmailJapanDesk"), '') IS NOT NULL
          OR NULLIF(TRIM("contactEmailKoreaDesk"), '') IS NOT NULL
        )
    `);

    await queryRunner.query(`
      UPDATE "site_settings"
      SET "socialLinks" = NULLIF(
        ('[]'::jsonb
          || CASE WHEN NULLIF(TRIM("socialFacebookUrl"), '') IS NOT NULL
              THEN jsonb_build_array(jsonb_build_object('icon', 'facebook', 'title', 'Facebook', 'url', NULLIF(TRIM("socialFacebookUrl"), '')))
              ELSE '[]'::jsonb
          END
          || CASE WHEN NULLIF(TRIM("socialTelegramUrl"), '') IS NOT NULL
              THEN jsonb_build_array(jsonb_build_object('icon', 'telegram', 'title', 'Telegram', 'url', NULLIF(TRIM("socialTelegramUrl"), '')))
              ELSE '[]'::jsonb
          END
          || CASE WHEN NULLIF(TRIM("socialYoutubeUrl"), '') IS NOT NULL
              THEN jsonb_build_array(jsonb_build_object('icon', 'youtube', 'title', 'YouTube', 'url', NULLIF(TRIM("socialYoutubeUrl"), '')))
              ELSE '[]'::jsonb
          END
          || CASE WHEN NULLIF(TRIM("socialLinkedinUrl"), '') IS NOT NULL
              THEN jsonb_build_array(jsonb_build_object('icon', 'linkedin', 'title', 'LinkedIn', 'url', NULLIF(TRIM("socialLinkedinUrl"), '')))
              ELSE '[]'::jsonb
          END
        ),
        '[]'::jsonb
      )
      WHERE "socialLinks" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "socialLinks"
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "openTime"
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "contact"
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "address"
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "footerBackground"
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "logo"
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "description"
    `);
    await queryRunner.query(`
      ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "title"
    `);
  }
}
