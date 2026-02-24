import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MenuEntity } from '@/modules/menu/menu.entity';
import { MenuItemEntity, MenuItemLabel } from '@/modules/menu/menuItem.entity';
import { CreateMenuDto } from '@/modules/menu/dto/create-menu.dto';
import { UpdateMenuDto } from '@/modules/menu/dto/update-menu.dto';
import { CreateMenuItemDto, MenuItemLabelDto } from '@/modules/menu/dto/create-menu-item.dto';
import { UpdateMenuItemDto } from '@/modules/menu/dto/update-menu-item.dto';
import slugify from 'slugify';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuEntity)
    private readonly menuRepository: Repository<MenuEntity>,
    @InjectRepository(MenuItemEntity)
    private readonly menuItemRepository: Repository<MenuItemEntity>,
  ) {}

  // Menus
  async createMenu(dto: CreateMenuDto): Promise<MenuEntity> {
    const nameExists = await this.menuRepository.findOne({ where: { name: dto.name } });
    if (nameExists) throw new HttpException('Menu name already exists', HttpStatus.UNPROCESSABLE_ENTITY);
    const slug = await this.generateUniqueSlug(dto.name);
    const menu = this.menuRepository.create({ name: dto.name, slug });
    return await this.menuRepository.save(menu);
  }

  async findAllMenus(): Promise<MenuEntity[]> {
    return await this.menuRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findMenuById(id: number): Promise<MenuEntity> {
    const menu = await this.menuRepository.findOne({ where: { id } });
    if (!menu) throw new HttpException('Menu not found', HttpStatus.NOT_FOUND);
    return menu;
  }

  async findMenuBySlug(slug: string): Promise<MenuEntity> {
    const menu = await this.menuRepository.findOne({ where: { slug } });
    if (!menu) throw new HttpException('Menu not found', HttpStatus.NOT_FOUND);
    return menu;
  }

  async updateMenu(id: number, dto: UpdateMenuDto): Promise<MenuEntity> {
    const menu = await this.findMenuById(id);
    if (dto.name && dto.name !== menu.name) {
      const exists = await this.menuRepository.findOne({ where: { name: dto.name } });
      if (exists) throw new HttpException('Menu name already exists', HttpStatus.UNPROCESSABLE_ENTITY);
      menu.name = dto.name;
      // Update slug to a unique one based on new name
      menu.slug = await this.generateUniqueSlug(dto.name, menu.id);
    }
    return await this.menuRepository.save(menu);
  }

  async removeMenu(id: number): Promise<void> {
    const menu = await this.findMenuById(id);
    await this.menuRepository.remove(menu);
  }

  // Menu Items
  async getMenuItems(menuId: number): Promise<any[]> {
    const menu = await this.findMenuById(menuId);
    const items = await this.menuItemRepository.find({
      where: { menu: { id: menu.id } },
      order: { orderIndex: 'ASC', id: 'ASC' },
      relations: ['parent'],
    });

    // Build a tree structure
    const byId = new Map<number, any>();
    const roots: any[] = [];
    items.forEach((it) => {
      byId.set(it.id, { ...this.mapItem(it), children: [] });
    });
    items.forEach((it) => {
      const node = byId.get(it.id);
      if (it.parent && byId.has(it.parent.id)) {
        byId.get(it.parent.id).children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  async getMenuItemsBySlug(slug: string): Promise<any[]> {
    const menu = await this.findMenuBySlug(slug);
    return this.getMenuItems(menu.id);
  }

  async getMenuWithTreeBySlug(slug: string): Promise<any> {
    const menu = await this.findMenuBySlug(slug);
    const items = await this.getMenuItems(menu.id);
    return {
      menu: {
        id: menu.id,
        name: menu.name,
        slug: menu.slug,
        createdAt: menu.createdAt,
        updatedAt: menu.updatedAt,
      },
      items,
    };
  }

  async findAllMenusWithItems(): Promise<any[]> {
    const menus = await this.menuRepository.find({ order: { createdAt: 'DESC' } });
    if (!menus.length) return [];

    const ids = menus.map((m) => m.id);
    const items = await this.menuItemRepository.find({
      where: { menu: { id: In(ids) } },
      relations: ['parent', 'menu'],
      order: { orderIndex: 'ASC', id: 'ASC' },
    });

    const byMenu = new Map<number, MenuItemEntity[]>();
    items.forEach((it) => {
      const mid = (it.menu as any)?.id ?? null;
      if (!mid) return;
      if (!byMenu.has(mid)) byMenu.set(mid, []);
      byMenu.get(mid)!.push(it);
    });

    const buildTree = (list: MenuItemEntity[]) => {
      const byId = new Map<number, any>();
      const roots: any[] = [];
      list.forEach((it) => byId.set(it.id, { ...this.mapItem(it), children: [] }));
      list.forEach((it) => {
        const node = byId.get(it.id);
        if (it.parent && byId.has(it.parent.id)) byId.get(it.parent.id).children.push(node);
        else roots.push(node);
      });
      return roots;
    };

    return menus.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      items: buildTree(byMenu.get(m.id) || []),
    }));
  }

  async createMenuItem(menuId: number, dto: CreateMenuItemDto): Promise<MenuItemEntity> {
    const menu = await this.findMenuById(menuId);
    let parent: MenuItemEntity | null = null;
    if (dto.parentId) {
      parent = await this.menuItemRepository.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new HttpException('Parent item not found', HttpStatus.BAD_REQUEST);
    }

    if (!dto.url) {
      // Ensure at least one target
      dto.url = '#';
    }

    // Compute next order index in a simple way for beginners
    const orderIndex = dto.orderIndex ?? (await this.getNextOrderIndex(menu, dto.parentId));

    const item = this.menuItemRepository.create({
      menu,
      parent: parent ?? null,
      label: this.normalizeLocalizedLabel(dto.label),
      url: dto.url ?? null,
      orderIndex,
    });
    return await this.menuItemRepository.save(item);
  }

  async updateMenuItem(menuId: number, itemId: number, dto: UpdateMenuItemDto): Promise<MenuItemEntity> {
    const item = await this.menuItemRepository.findOne({ where: { id: itemId }, relations: ['menu', 'parent'] });
    if (!item || item.menu.id !== menuId) throw new HttpException('Menu item not found', HttpStatus.NOT_FOUND);

    // Handle parent change with simple cycle protection
    if (dto.parentId !== undefined) {
      if (dto.parentId === null) {
        item.parent = null;
      } else {
        if (dto.parentId === item.id) throw new HttpException('Item cannot be its own parent', HttpStatus.BAD_REQUEST);
        let next = await this.menuItemRepository.findOne({ where: { id: dto.parentId }, relations: ['parent'] });
        if (!next) throw new HttpException('Parent item not found', HttpStatus.BAD_REQUEST);
        // Walk up the chain to prevent cycles
        let cursor = next;
        while (cursor) {
          if (cursor.id === item.id) throw new HttpException('Invalid parent (cycle)', HttpStatus.BAD_REQUEST);
          cursor = cursor.parent as any;
        }
        item.parent = next;
      }
    }

    if (dto.label !== undefined) {
      item.label = this.normalizeLocalizedLabel(dto.label);
    }
    if (dto.url !== undefined) item.url = dto.url ?? null;
    if (dto.orderIndex !== undefined) item.orderIndex = dto.orderIndex;

    return await this.menuItemRepository.save(item);
  }

  async removeMenuItem(menuId: number, itemId: number): Promise<void> {
    const item = await this.menuItemRepository.findOne({ where: { id: itemId }, relations: ['menu'] });
    if (!item || item.menu.id !== menuId) throw new HttpException('Menu item not found', HttpStatus.NOT_FOUND);
    await this.menuItemRepository.remove(item);
  }

  // Helpers
  private slugify(name: string): string {
    if (!name || !name.trim()) throw new HttpException('Invalid name', HttpStatus.BAD_REQUEST);
    return slugify(name, { lower: true, strict: true, trim: true });
  }

  private async generateUniqueSlug(name: string, currentId?: number): Promise<string> {
    const base = this.slugify(name);
    let slug = base;
    let i = 2;
    while (true) {
      const existing = await this.menuRepository.findOne({ where: { slug } });
      if (!existing || (currentId && existing.id === currentId)) break;
      slug = `${base}-${i++}`;
    }
    return slug;
  }

  private async getNextOrderIndex(menu: MenuEntity, parentId?: number | null): Promise<number> {
    const where: any = { menu: { id: menu.id } };
    where.parent = parentId ? ({ id: parentId } as any) : null;
    const siblings = await this.menuItemRepository.find({ where });
    if (!siblings.length) return 0;
    const max = Math.max(...siblings.map((s) => s.orderIndex ?? 0));
    return max + 1;
  }

  private mapItem(i: MenuItemEntity) {
    return {
      id: i.id,
      label: this.toLocalizedLabel(i.label),
      url: i.url ?? null,
      orderIndex: i.orderIndex,
      parentId: i.parent ? i.parent.id : null,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    };
  }

  private normalizeLocalizedLabel(input: MenuItemLabelDto | string | null | undefined): MenuItemLabel {
    const label = this.toLocalizedLabel(input);
    if (!label.en && !label.km) {
      throw new HttpException('label.en or label.km is required', HttpStatus.BAD_REQUEST);
    }
    return label;
  }

  private toLocalizedLabel(input: MenuItemLabelDto | MenuItemLabel | string | null | undefined): MenuItemLabel {
    if (typeof input === 'string') {
      const value = this.normalizeLabelText(input);
      return {
        en: value,
        km: null,
      };
    }

    if (!input || typeof input !== 'object') {
      return {
        en: null,
        km: null,
      };
    }

    return {
      en: this.normalizeLabelText((input as MenuItemLabelDto).en),
      km: this.normalizeLabelText((input as MenuItemLabelDto).km),
    };
  }

  private normalizeLabelText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
