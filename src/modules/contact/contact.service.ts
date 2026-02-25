import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { ContactEntity } from "./contact.entity";
import { CreateContactDto } from "./dto/create-contact.dto";
import { ListContactDto } from "./dto/list-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";


@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactEntity)
    private readonly repo: Repository<ContactEntity>,
  ) {}

  async create(dto: CreateContactDto) {
    const entity = this.repo.create({
      ...dto,
      isRead: dto.isRead ?? false,
    });
    return this.repo.save(entity);
  }

  async findAll(query: ListContactDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder("c");

    if (query.q?.trim()) {
      const q = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where("LOWER(c.firstName) LIKE :q", { q })
            .orWhere("LOWER(c.lastName) LIKE :q", { q })
            .orWhere("LOWER(c.email) LIKE :q", { q })
            .orWhere("LOWER(c.organisationName) LIKE :q", { q })
            .orWhere("LOWER(c.subject) LIKE :q", { q })
            .orWhere("LOWER(c.message) LIKE :q", { q });
        }),
      );
    }

    qb.orderBy(`c.${query.sortBy ?? "createdAt"}`, query.order ?? "DESC")
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException("Contact not found");
    return item;
  }

  async update(id: string, dto: UpdateContactDto) {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async markRead(id: string, isRead: boolean) {
    const item = await this.findOne(id);
    item.isRead = isRead;
    return this.repo.save(item);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.repo.remove(item);
    return { success: true };
  }
}