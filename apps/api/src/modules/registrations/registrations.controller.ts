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
import { UserRole } from 'shared-types';
import { registrationSchema } from 'validation';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RegistrationsService } from './registrations.service';

@Controller()
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  // PUBLIC endpoint — registration form
  @Post('seminars/:seminarId/register')
  register(
    @Param('seminarId', ParseUUIDPipe) seminarId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const data = registrationSchema.parse(body);
    return this.registrationsService.register(seminarId, data);
  }

  // PROTECTED endpoints
  @Get('seminars/:seminarId/registrations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  findAll(@Param('seminarId', ParseUUIDPipe) seminarId: string) {
    return this.registrationsService.findAll(seminarId);
  }

  @Get('seminars/:seminarId/attendance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  getAttendanceList(@Param('seminarId', ParseUUIDPipe) seminarId: string) {
    return this.registrationsService.getAttendanceList(seminarId);
  }

  @Get('seminars/:seminarId/registrations/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  getStats(@Param('seminarId', ParseUUIDPipe) seminarId: string) {
    return this.registrationsService.getStats(seminarId);
  }

  @Post('seminars/:seminarId/walk-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  addWalkIn(
    @Param('seminarId', ParseUUIDPipe) seminarId: string,
    @Body() body: { firstName: string; lastName: string; email: string },
  ) {
    return this.registrationsService.addWalkIn(seminarId, body);
  }

  @Patch('registrations/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: 'PRESENT' | 'ABSENT',
  ) {
    return this.registrationsService.updateStatus(id, status);
  }

  @Delete('registrations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.registrationsService.remove(id);
  }
}
