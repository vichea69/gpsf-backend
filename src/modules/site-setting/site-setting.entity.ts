import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface LocalizedTextValue {
  en?: string;
  km?: string;
}

export interface SiteContactDeskValue {
  title: string;
  emails: string[];
}

export interface SiteContactLanguageValue {
  phones: string[];
  desks: SiteContactDeskValue[];
}

export interface SiteContactValue {
  en?: SiteContactLanguageValue;
  km?: SiteContactLanguageValue;
}

export interface SiteSocialLinkValue {
  icon: string;
  title: string;
  url: string;
}

@Entity({ name: 'site_settings' })
export class SiteSettingEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 200 })
  siteName: string;

  @Column({ type: 'jsonb', nullable: true })
  title?: LocalizedTextValue | null;

  @Column({ type: 'jsonb', nullable: true })
  description?: LocalizedTextValue | null;

  @Column({ type: 'varchar', length: 600, nullable: true })
  logo?: string | null;

  @Column({ type: 'varchar', length: 600, nullable: true })
  footerBackground?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  address?: LocalizedTextValue | null;

  @Column({ type: 'jsonb', nullable: true })
  contact?: SiteContactValue | null;

  @Column({ type: 'jsonb', nullable: true })
  openTime?: LocalizedTextValue | null;

  @Column({ type: 'jsonb', nullable: true })
  socialLinks?: SiteSocialLinkValue[] | null;

  // Legacy fields kept for backward compatibility.
  @Column({ type: 'text', nullable: true })
  siteDescription?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  siteKeyword?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sitePhone?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  siteEmail?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  siteAuthor?: string | null;

  @Column({ type: 'varchar', length: 600, nullable: true })
  siteLogo?: string | null;

  @Column({ type: 'varchar', length: 600, nullable: true })
  contactHeroImage?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactSectionLabel?: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  contactHeadline?: string | null;

  @Column({ type: 'text', nullable: true })
  contactAddress?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhonePrimary?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhoneSecondary?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contactEmailGeneral?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contactEmailInfo?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contactEmailChinaDesk?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contactEmailEuDesk?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contactEmailJapanDesk?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contactEmailKoreaDesk?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  contactOpenTime?: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  contactMapEmbedUrl?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  socialFacebookUrl?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  socialTelegramUrl?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  socialYoutubeUrl?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  socialLinkedinUrl?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
