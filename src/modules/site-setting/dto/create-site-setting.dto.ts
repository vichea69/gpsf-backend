import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateSiteSettingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  siteName: string;

  @IsString()
  @IsOptional()
  siteDescription?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  siteKeyword?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  sitePhone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  siteAuthor?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  siteEmail?: string;

  @IsString()
  @IsOptional()
  @MaxLength(600)
  siteLogo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(600)
  contactHeroImage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactSectionLabel?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  contactHeadline?: string;

  @IsString()
  @IsOptional()
  contactAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhonePrimary?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhoneSecondary?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  contactEmailGeneral?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  contactEmailInfo?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  contactEmailChinaDesk?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  contactEmailEuDesk?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  contactEmailJapanDesk?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  contactEmailKoreaDesk?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  contactOpenTime?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  contactMapEmbedUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  socialFacebookUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  socialTelegramUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  socialYoutubeUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  socialLinkedinUrl?: string;
}
