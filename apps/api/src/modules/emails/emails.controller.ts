import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CampaignType, RecipientTarget, UserRole } from 'shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmailsService } from './emails.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ORGANIZER)
@Controller()
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  // --- Templates ---

  @Post('email-templates')
  createTemplate(@Body() body: Record<string, unknown>) {
    return this.emailsService.createTemplate(
      body as unknown as Parameters<EmailsService['createTemplate']>[0],
    );
  }

  @Get('email-templates')
  findAllTemplates() {
    return this.emailsService.findAllTemplates();
  }

  @Get('email-templates/:id')
  findTemplateById(@Param('id', ParseUUIDPipe) id: string) {
    return this.emailsService.findTemplateById(id);
  }

  @Patch('email-templates/:id')
  updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.emailsService.updateTemplate(
      id,
      body as Parameters<EmailsService['updateTemplate']>[1],
    );
  }

  @Delete('email-templates/:id')
  @HttpCode(HttpStatus.OK)
  deleteTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.emailsService.deleteTemplate(id);
  }

  // --- Campaigns ---

  @Post('seminars/:seminarId/campaigns')
  createCampaign(
    @Param('seminarId', ParseUUIDPipe) seminarId: string,
    @Body('templateId') templateId: string,
    @Body('type') type: CampaignType,
    @Body('recipientTarget') recipientTarget: RecipientTarget,
  ) {
    return this.emailsService.createCampaign(
      seminarId,
      templateId,
      type,
      recipientTarget,
    );
  }

  @Get('seminars/:seminarId/campaigns')
  findCampaignsBySeminar(@Param('seminarId', ParseUUIDPipe) seminarId: string) {
    return this.emailsService.findCampaignsBySeminar(seminarId);
  }

  @Post('campaigns/:id/send')
  sendCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.emailsService.sendCampaign(id);
  }

  @Post('seminars/:seminarId/remind')
  sendManualReminder(
    @Param('seminarId', ParseUUIDPipe) seminarId: string,
    @Body('templateId') templateId: string,
  ) {
    return this.emailsService.sendManualReminder(seminarId, templateId);
  }
}
