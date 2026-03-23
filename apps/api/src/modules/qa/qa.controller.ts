import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole, QuestionStatus } from 'shared-types';
import { submitQuestionSchema } from 'validation';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { QaService } from './qa.service';

@Controller('qa')
export class QaController {
  constructor(private readonly qaService: QaService) {}

  // ------- PUBLIC ENDPOINTS -------

  @Post('sessions/:sessionId/questions')
  @HttpCode(HttpStatus.CREATED)
  submitQuestion(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const data = submitQuestionSchema.parse(body);
    return this.qaService.submitQuestion(sessionId, data);
  }

  @Get('sessions/:code/public')
  findSessionByCode(@Param('code') code: string) {
    return this.qaService.findSessionByCode(code);
  }

  @Get('sessions/:sessionId/screen')
  getApprovedQuestions(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.qaService.getApprovedQuestions(sessionId);
  }

  // ------- PROTECTED ENDPOINTS -------

  @Post('sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR)
  @HttpCode(HttpStatus.CREATED)
  createSession(@Body() body: { title: string; seminarId?: string }) {
    return this.qaService.createSession(body.title, body.seminarId);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR)
  findAll() {
    return this.qaService.findAll();
  }

  @Get('sessions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR)
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.qaService.findSessionById(id);
  }

  @Patch('sessions/:id/open')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR)
  openSession(@Param('id', ParseUUIDPipe) id: string) {
    return this.qaService.openSession(id);
  }

  @Patch('sessions/:id/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR)
  closeSession(@Param('id', ParseUUIDPipe) id: string) {
    return this.qaService.closeSession(id);
  }

  @Get('sessions/:id/questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR)
  getQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: QuestionStatus,
  ) {
    return this.qaService.getQuestions(id, status);
  }

  @Patch('questions/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR)
  approveQuestion(@Param('id', ParseUUIDPipe) id: string) {
    return this.qaService.approveQuestion(id);
  }

  @Patch('questions/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR)
  rejectQuestion(@Param('id', ParseUUIDPipe) id: string) {
    return this.qaService.rejectQuestion(id);
  }

  @Patch('questions/:id/answered')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR)
  markAnswered(@Param('id', ParseUUIDPipe) id: string) {
    return this.qaService.markAnswered(id);
  }

  @Patch('questions/:id/content')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR)
  updateQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('content') content: string,
  ) {
    return this.qaService.updateQuestion(id, content);
  }

  @Patch('questions/:id/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR)
  reorderQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('order') order: number,
  ) {
    return this.qaService.reorderQuestion(id, order);
  }
}
