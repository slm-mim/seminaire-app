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
} from '@nestjs/common';
import { UserRole, SeminarStatus } from 'shared-types';
import { createSeminarSchema, updateSeminarSchema } from 'validation';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SeminarsService } from './seminars.service';

@Controller('seminars')
export class SeminarsController {
  constructor(private readonly seminarsService: SeminarsService) {}

  // Public endpoint - get published seminars
  @Get('public')
  findPublic() {
    return this.seminarsService.findAll(SeminarStatus.PUBLISHED);
  }

  // Public endpoint - get single seminar by ID
  @Get('public/:id')
  findPublicById(@Param('id', ParseUUIDPipe) id: string) {
    return this.seminarsService.findById(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  findAll(@Query('status') status?: SeminarStatus) {
    return this.seminarsService.findAll(status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.seminarsService.findById(id);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  getStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.seminarsService.getStats(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  create(
    @Body() body: Record<string, unknown>,
    @CurrentUser('id') userId: string,
  ) {
    const data = createSeminarSchema.parse(body);
    return this.seminarsService.create(data, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const data = updateSeminarSchema.parse(body);
    return this.seminarsService.update(id, data);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: SeminarStatus,
  ) {
    return this.seminarsService.updateStatus(id, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.seminarsService.remove(id);
  }
}
