import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      totalSeminars,
      upcomingSeminars,
      totalContacts,
      totalRegistrations,
      seminarsByStatus,
      recentSeminars,
    ] = await Promise.all([
      this.prisma.seminar.count(),
      this.prisma.seminar.count({
        where: { date: { gte: new Date() }, status: 'PUBLISHED' },
      }),
      this.prisma.contact.count(),
      this.prisma.registration.count(),
      this.prisma.seminar.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.seminar.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        include: {
          _count: { select: { registrations: true } },
          creator: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const s of seminarsByStatus) {
      statusCounts[s.status] = s._count;
    }

    return {
      totalSeminars,
      upcomingSeminars,
      totalContacts,
      totalRegistrations,
      seminarsByStatus: statusCounts,
      recentSeminars,
    };
  }

  async getAttendanceStats() {
    const registrations = await this.prisma.registration.groupBy({
      by: ['status'],
      _count: true,
    });

    const stats: Record<string, number> = {};
    for (const r of registrations) {
      stats[r.status] = r._count;
    }

    return {
      total: Object.values(stats).reduce((a, b) => a + b, 0),
      ...stats,
    };
  }
}
