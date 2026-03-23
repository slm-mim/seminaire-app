import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { UserRole } from 'shared-types';
import { createContactSchema, updateContactSchema } from 'validation';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BrevoSyncService } from './brevo-sync.service';
import { ContactsService } from './contacts.service';

@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ORGANIZER)
export class ContactsController {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly brevoSyncService: BrevoSyncService,
  ) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.contactsService.findAll(search);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="contacts.csv"')
  async exportToCsv() {
    return this.contactsService.exportToCsv();
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactsService.findById(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    const data = createContactSchema.parse(body);
    return this.contactsService.create(data);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importFromCsv(@Body() body: { csv: string }) {
    return this.contactsService.importFromCsv(body.csv);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const data = updateContactSchema.parse(body);
    return this.contactsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactsService.remove(id);
  }

  @Post('sync/to-brevo')
  @HttpCode(HttpStatus.OK)
  syncToBrevo() {
    return this.brevoSyncService.syncAllToBrevo();
  }

  @Post('sync/from-brevo')
  @HttpCode(HttpStatus.OK)
  syncFromBrevo() {
    return this.brevoSyncService.syncFromBrevo();
  }
}
