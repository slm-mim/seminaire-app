import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserRole } from 'shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RegistrationsService } from '../registrations/registrations.service';

@Controller('checkin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ORGANIZER)
export class CheckinController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  // Full check-in data for a seminar (attendance list + stats in one call)
  @Get('seminars/:seminarId')
  async getCheckinData(@Param('seminarId', ParseUUIDPipe) seminarId: string) {
    const [attendanceList, stats] = await Promise.all([
      this.registrationsService.getAttendanceList(seminarId),
      this.registrationsService.getStats(seminarId),
    ]);
    return { attendanceList, stats };
  }

  // Quick toggle present/absent
  @Patch('registrations/:id/toggle')
  async togglePresence(@Param('id', ParseUUIDPipe) id: string) {
    // Get current status, toggle between PRESENT and REGISTERED/ABSENT
    return this.registrationsService.togglePresence(id);
  }

  // Add walk-in
  @Post('seminars/:seminarId/walk-in')
  async addWalkIn(
    @Param('seminarId', ParseUUIDPipe) seminarId: string,
    @Body() body: { firstName: string; lastName: string; email: string },
  ) {
    return this.registrationsService.addWalkIn(seminarId, body);
  }
}
