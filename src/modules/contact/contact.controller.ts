import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { ListContactDto } from "./dto/list-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";


@Controller("contact")
export class ContactController {
  constructor(private readonly service: ContactService) {}

  // POST /contact (public contact form submit)
  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.service.create(dto);
  }

  // GET /contact?q=&page=&limit=
  @Get()
  findAll(@Query() query: ListContactDto) {
    return this.service.findAll(query);
  }

  // GET /contact/:id
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  // PATCH /contact/:id
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateContactDto) {
    return this.service.update(id, dto);
  }

  // PATCH /contact/:id/read  body: { isRead: true }
  @Patch(":id/read")
  markRead(@Param("id") id: string, @Body() body: { isRead?: boolean }) {
    return this.service.markRead(id, body?.isRead ?? true);
  }

  // DELETE /contact/:id
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}