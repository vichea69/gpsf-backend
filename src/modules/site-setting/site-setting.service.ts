import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteSettingEntity } from '@/modules/site-setting/site-setting.entity';
import { CreateSiteSettingDto } from '@/modules/site-setting/dto/create-site-setting.dto';
import { UpdateSiteSettingDto } from '@/modules/site-setting/dto/update-site-setting.dto';
import { UploadedFilePayload } from '@/types/uploaded-file.type';
import * as fs from 'fs';
import * as path from 'path';

type ContactDeskKey = 'general' | 'chinaDesk' | 'euDesk' | 'japanDesk' | 'koreaDesk';

type ContactPanelDesk = {
  key: ContactDeskKey;
  label: string;
  emails: string[];
};

type ContactSocialLink = {
  type: 'facebook' | 'telegram' | 'youtube' | 'linkedin';
  url: string;
};

export type ContactPanelResponse = {
  address: {
    title: string;
    value: string | null;
  };
  contact: {
    title: string;
    phones: string[];
    desks: ContactPanelDesk[];
  };
  openTime: {
    title: string;
    days: string | null;
    hours: string | null;
    raw: string | null;
  };
  stayConnected: {
    title: string;
    links: ContactSocialLink[];
  };
  mapEmbedUrl: string | null;
  updatedAt: Date;
};

@Injectable()
export class SiteSettingService {
  constructor(
    @InjectRepository(SiteSettingEntity)
    private readonly siteSettingRepository: Repository<SiteSettingEntity>,
  ) {}

  async create(dto: CreateSiteSettingDto, file?: UploadedFilePayload | null): Promise<SiteSettingEntity> {
    const siteSetting = this.siteSettingRepository.create(dto);
    if (file?.buffer) {
      siteSetting.siteLogo = await this.uploadLogo(file);
    }
    return await this.siteSettingRepository.save(siteSetting);
  }

  async findAll(): Promise<SiteSettingEntity[]> {
    return await this.siteSettingRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findCurrent(): Promise<SiteSettingEntity | null> {
    const [siteSetting] = await this.siteSettingRepository.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });
    return siteSetting ?? null;
  }

  async findCurrentContactPanel(): Promise<ContactPanelResponse | null> {
    const current = await this.findCurrent();
    if (!current) {
      return null;
    }
    return this.toContactPanel(current);
  }

  async findOne(id: number): Promise<SiteSettingEntity> {
    const siteSetting = await this.siteSettingRepository.findOne({ where: { id } });
    if (!siteSetting) {
      throw new NotFoundException('Site setting not found');
    }
    return siteSetting;
  }

  async update(
    id: number,
    dto: UpdateSiteSettingDto,
    file?: UploadedFilePayload | null,
  ): Promise<SiteSettingEntity> {
    const siteSetting = await this.findOne(id);
    const previousLogo = siteSetting.siteLogo ?? null;

    Object.assign(siteSetting, dto);
    if (file?.buffer) {
      siteSetting.siteLogo = await this.uploadLogo(file);
    }

    const saved = await this.siteSettingRepository.save(siteSetting);

    if (previousLogo && previousLogo !== saved.siteLogo) {
      this.removeLocalFile(previousLogo);
    }

    return saved;
  }

  async upsertCurrent(dto: UpdateSiteSettingDto, file?: UploadedFilePayload | null): Promise<SiteSettingEntity> {
    const current = await this.findCurrent();

    if (!current) {
      const createDto = dto as CreateSiteSettingDto;
      if (!createDto.siteName || !createDto.siteName.trim()) {
        throw new NotFoundException('No site setting exists yet. siteName is required to create the first record.');
      }
      return this.create(createDto, file);
    }

    return this.update(current.id, dto, file);
  }

  async remove(id: number): Promise<void> {
    const siteSetting = await this.findOne(id);
    const oldLogo = siteSetting.siteLogo ?? null;
    await this.siteSettingRepository.remove(siteSetting);
    if (oldLogo) {
      this.removeLocalFile(oldLogo);
    }
  }

  private async uploadLogo(file: UploadedFilePayload): Promise<string> {
    const key = this.generateObjectKey(file.originalname);
    const filePath = path.join(process.cwd(), key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, file.buffer);
    return `/${key}`;
  }

  private generateObjectKey(originalName: string): string {
    const ext = originalName && originalName.includes('.') ? originalName.split('.').pop() : 'bin';
    const random = Math.random().toString(36).slice(2);
    const stamp = Date.now();
    const uploadRoot = (process.env.LOCAL_UPLOAD_PATH || 'uploads').replace(/^\/+|\/+$/g, '');
    return `${uploadRoot}/site-settings/${stamp}-${random}.${ext}`;
  }

  private toContactPanel(siteSetting: SiteSettingEntity): ContactPanelResponse {
    const openTimeRaw = this.normalizeText(siteSetting.contactOpenTime);
    const openTimeLines = this.splitLines(openTimeRaw);

    return {
      address: {
        title: 'Address',
        value: this.normalizeText(siteSetting.contactAddress),
      },
      contact: {
        title: 'Contact',
        phones: this.uniqueStrings([
          siteSetting.contactPhonePrimary,
          siteSetting.contactPhoneSecondary,
          siteSetting.sitePhone,
        ]),
        desks: this.buildDeskBlocks(siteSetting),
      },
      openTime: {
        title: 'Open Time',
        days: openTimeLines[0] ?? null,
        hours: openTimeLines.length > 1 ? openTimeLines.slice(1).join(' ') : null,
        raw: openTimeRaw,
      },
      stayConnected: {
        title: 'Stay Connected',
        links: this.buildSocialLinks(siteSetting),
      },
      mapEmbedUrl: this.normalizeText(siteSetting.contactMapEmbedUrl),
      updatedAt: siteSetting.updatedAt,
    };
  }

  private buildDeskBlocks(siteSetting: SiteSettingEntity): ContactPanelDesk[] {
    const blocks: ContactPanelDesk[] = [
      {
        key: 'general',
        label: 'General',
        emails: this.uniqueStrings([siteSetting.contactEmailGeneral, siteSetting.contactEmailInfo]),
      },
      {
        key: 'chinaDesk',
        label: 'China Desk',
        emails: this.uniqueStrings([siteSetting.contactEmailChinaDesk]),
      },
      {
        key: 'euDesk',
        label: 'EU Desk',
        emails: this.uniqueStrings([siteSetting.contactEmailEuDesk]),
      },
      {
        key: 'japanDesk',
        label: 'Japan Desk',
        emails: this.uniqueStrings([siteSetting.contactEmailJapanDesk]),
      },
      {
        key: 'koreaDesk',
        label: 'Korea Desk',
        emails: this.uniqueStrings([siteSetting.contactEmailKoreaDesk]),
      },
    ];

    return blocks.filter((item) => item.emails.length > 0);
  }

  private buildSocialLinks(siteSetting: SiteSettingEntity): ContactSocialLink[] {
    const links: Array<ContactSocialLink | null> = [
      this.createSocialLink('facebook', siteSetting.socialFacebookUrl),
      this.createSocialLink('telegram', siteSetting.socialTelegramUrl),
      this.createSocialLink('youtube', siteSetting.socialYoutubeUrl),
      this.createSocialLink('linkedin', siteSetting.socialLinkedinUrl),
    ];

    return links.filter((item): item is ContactSocialLink => Boolean(item));
  }

  private createSocialLink(
    type: ContactSocialLink['type'],
    url?: string | null,
  ): ContactSocialLink | null {
    const normalizedUrl = this.normalizeText(url);
    if (!normalizedUrl) {
      return null;
    }
    return { type, url: normalizedUrl };
  }

  private uniqueStrings(values: Array<string | null | undefined>): string[] {
    const set = new Set<string>();
    for (const value of values) {
      const normalized = this.normalizeText(value);
      if (normalized) {
        set.add(normalized);
      }
    }
    return Array.from(set);
  }

  private splitLines(value?: string | null): string[] {
    if (!value) {
      return [];
    }
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private normalizeText(value?: string | null): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private removeLocalFile(url: string): void {
    const relativePath = this.toRelativePath(url);
    const uploadPrefix = `/${this.getUploadRoot()}/`;

    if (!relativePath.startsWith(uploadPrefix)) {
      return;
    }

    const absolutePath = path.join(process.cwd(), relativePath.replace(/^\/+/, ''));
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }

  private toRelativePath(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }

  private getUploadRoot(): string {
    return (process.env.LOCAL_UPLOAD_PATH || 'uploads').replace(/^\/+|\/+$/g, '');
  }
}
