import type { FastifyInstance } from 'fastify';
import { prisma } from '@controle-ponto/db';
import type { DashboardKPIs, SectorStats } from '@controle-ponto/types';

export async function dashboardRoutes(app: FastifyInstance) {
  // GET /dashboard/kpis
  app.get<{ Querystring: { date?: string } }>('/dashboard/kpis', async (request) => {
    const { date } = request.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const [
      totalEmployees,
      activeEmployees,
      totalSectors,
      todayOccurrences,
      openOccurrences,
      resolvedToday,
      lateToday,
      overToday,
      underToday,
      incompleteToday,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { active: true } }),
      prisma.sector.count(),
      prisma.occurrence.count({ where: { date: targetDate } }),
      prisma.occurrence.count({ where: { status: 'OPEN' } }),
      prisma.occurrence.count({
        where: {
          date: targetDate,
          status: 'RESOLVED',
        },
      }),
      prisma.occurrence.count({
        where: {
          date: targetDate,
          type: 'LATE',
        },
      }),
      prisma.occurrence.count({
        where: {
          date: targetDate,
          type: 'OVER',
        },
      }),
      prisma.occurrence.count({
        where: {
          date: targetDate,
          type: 'UNDER',
        },
      }),
      prisma.occurrence.count({
        where: {
          date: targetDate,
          type: 'INCOMPLETE',
        },
      }),
    ]);

    const kpis: DashboardKPIs = {
      totalEmployees,
      activeEmployees,
      totalSectors,
      todayOccurrences,
      openOccurrences,
      resolvedToday,
      lateToday,
      overToday,
      underToday,
      incompleteToday,
    };

    return {
      success: true,
      data: kpis,
    };
  });

  // GET /dashboard/sectors
  app.get('/dashboard/sectors', async () => {
    const sectors = await prisma.sector.findMany({
      include: {
        employees: {
          where: { active: true },
          include: {
            occurrences: {
              where: { status: 'OPEN' },
            },
          },
        },
      },
    });

    const stats: SectorStats[] = sectors.map((sector) => ({
      sectorId: sector.id,
      sectorName: sector.name,
      employeeCount: sector.employees.length,
      openOccurrences: sector.employees.reduce(
        (acc, emp) => acc + emp.occurrences.length,
        0
      ),
      pendingJustifications: 0, // TODO: Implementar contagem de justificativas pendentes
    }));

    return {
      success: true,
      data: stats,
    };
  });

  // GET /dashboard/recent-occurrences
  app.get('/dashboard/recent-occurrences', async () => {
    const occurrences = await prisma.occurrence.findMany({
      where: { status: 'OPEN' },
      include: {
        employee: {
          include: {
            sector: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      success: true,
      data: occurrences,
    };
  });

  // GET /dashboard/daily-summary
  app.get<{ Querystring: { date?: string } }>('/dashboard/daily-summary', async (request) => {
    const { date } = request.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const worklogs = await prisma.dailyWorklog.findMany({
      where: { date: targetDate },
      include: {
        employee: {
          include: {
            sector: true,
          },
        },
      },
    });

    const summary = {
      date: targetDate.toISOString().split('T')[0],
      totalWorklogs: worklogs.length,
      processedCount: worklogs.filter((w) => w.status === 'PROCESSED').length,
      errorCount: worklogs.filter((w) => w.status === 'ERROR').length,
      avgWorkedMinutes:
        worklogs.length > 0
          ? Math.round(
              worklogs.reduce((acc, w) => acc + w.workedMinutes, 0) / worklogs.length
            )
          : 0,
      totalLateMinutes: worklogs.reduce((acc, w) => acc + w.lateMinutes, 0),
      totalExtraMinutes: worklogs.reduce((acc, w) => acc + w.extraMinutes, 0),
      totalUnderMinutes: worklogs.reduce((acc, w) => acc + w.underMinutes, 0),
    };

    return {
      success: true,
      data: summary,
    };
  });
}
