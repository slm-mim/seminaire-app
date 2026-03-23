import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CampaignStatus,
  CampaignType,
  EmailTemplateType,
  RecipientTarget,
} from 'shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailSenderService } from './email-sender.service';

interface CreateTemplateData {
  name: string;
  subject: string;
  htmlContent: string;
  type: EmailTemplateType;
}

interface UpdateTemplateData {
  name?: string;
  subject?: string;
  htmlContent?: string;
  type?: EmailTemplateType;
}

@Injectable()
export class EmailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailSender: EmailSenderService,
  ) {}

  // --- Templates ---

  async createTemplate(data: CreateTemplateData) {
    return this.prisma.emailTemplate.create({ data });
  }

  async findAllTemplates() {
    return this.prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTemplateById(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Template e-mail non trouvé');
    return template;
  }

  async updateTemplate(id: string, data: UpdateTemplateData) {
    await this.findTemplateById(id);
    return this.prisma.emailTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: string) {
    await this.findTemplateById(id);
    await this.prisma.emailTemplate.delete({ where: { id } });
    return { message: 'Template supprimé' };
  }

  // --- Campaigns ---

  async createCampaign(
    seminarId: string,
    templateId: string,
    type: CampaignType,
    recipientTarget: RecipientTarget,
  ) {
    const seminar = await this.prisma.seminar.findUnique({
      where: { id: seminarId },
    });
    if (!seminar) throw new NotFoundException('Séminaire non trouvé');

    await this.findTemplateById(templateId);

    return this.prisma.emailCampaign.create({
      data: {
        seminarId,
        templateId,
        type,
        recipientTarget,
        status: CampaignStatus.DRAFT,
      },
      include: { template: true },
    });
  }

  async findCampaignsBySeminar(seminarId: string) {
    const seminar = await this.prisma.seminar.findUnique({
      where: { id: seminarId },
    });
    if (!seminar) throw new NotFoundException('Séminaire non trouvé');

    return this.prisma.emailCampaign.findMany({
      where: { seminarId },
      include: { template: true },
      orderBy: { id: 'desc' },
    });
  }

  async sendCampaign(campaignId: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        template: true,
        seminar: true,
      },
    });
    if (!campaign) throw new NotFoundException('Campagne non trouvée');

    const seminar = campaign.seminar;

    // Resolve recipients based on recipientTarget
    let recipients: { email: string; firstName: string; lastName: string }[] =
      [];

    if (campaign.recipientTarget === RecipientTarget.ALL_CONTACTS) {
      const contacts = await this.prisma.contact.findMany();
      recipients = contacts.map((c) => ({
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
      }));
    } else if (campaign.recipientTarget === RecipientTarget.ALL_REGISTERED) {
      const registrations = await this.prisma.registration.findMany({
        where: { seminarId: seminar.id },
        include: { contact: true },
      });
      recipients = registrations.map((r) => ({
        email: r.contact.email,
        firstName: r.contact.firstName,
        lastName: r.contact.lastName,
      }));
    } else if (campaign.recipientTarget === RecipientTarget.PRESENT_ONLY) {
      const registrations = await this.prisma.registration.findMany({
        where: { seminarId: seminar.id, status: 'PRESENT' },
        include: { contact: true },
      });
      recipients = registrations.map((r) => ({
        email: r.contact.email,
        firstName: r.contact.firstName,
        lastName: r.contact.lastName,
      }));
    }

    // Replace template variables (global vars, per-recipient handled in sendBulk)
    const globalVars: Record<string, string> = {
      titre: seminar.title,
      date: seminar.date.toLocaleDateString('fr-FR'),
      lieu: seminar.location,
      intervenant: seminar.speaker,
      prix: seminar.price.toString(),
    };

    let processedHtml = campaign.template.htmlContent;
    for (const [key, value] of Object.entries(globalVars)) {
      processedHtml = processedHtml.replace(
        new RegExp(`\\{${key}\\}`, 'g'),
        value,
      );
    }

    let processedSubject = campaign.template.subject;
    for (const [key, value] of Object.entries(globalVars)) {
      processedSubject = processedSubject.replace(
        new RegExp(`\\{${key}\\}`, 'g'),
        value,
      );
    }

    const { sent } = await this.emailSender.sendBulk(
      recipients,
      processedSubject,
      processedHtml,
      globalVars,
    );

    // Update campaign status
    return this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SENT,
        sentAt: new Date(),
        recipientCount: sent,
      },
      include: { template: true },
    });
  }

  async sendManualReminder(seminarId: string, templateId: string) {
    const campaign = await this.createCampaign(
      seminarId,
      templateId,
      CampaignType.MANUAL_REMINDER,
      RecipientTarget.ALL_REGISTERED,
    );
    return this.sendCampaign(campaign.id);
  }
}
