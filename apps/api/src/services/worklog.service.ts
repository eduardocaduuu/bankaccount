import { prisma, type PunchType as PrismaPunchType, type OccurrenceType as PrismaOccurrenceType } from '@controle-ponto/db';
import { calculateWorklog, DEFAULT_WORKDAY_CONFIG, type WorkdayConfig } from '@controle-ponto/core';
import type { Punch, PunchType, WorklogCalculation } from '@controle-ponto/types';
import { logger } from '../utils/logger.js';

export class WorklogService {
  private config: WorkdayConfig;

  constructor(config: WorkdayConfig = DEFAULT_WORKDAY_CONFIG) {
    this.config = config;
  }

  async processDay(employeeId: string, date: Date): Promise<WorklogCalculation> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Busca marcações do dia
    const punchEvents = await prisma.punchEvent.findMany({
      where: {
        employeeId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Converte para o formato do core
    const punches: Punch[] = punchEvents.map((p) => ({
      timestamp: p.timestamp,
      type: p.type as PunchType,
    }));

    // Calcula o worklog
    const worklog = calculateWorklog(punches, this.config);

    logger.info(
      {
        employeeId,
        date: startOfDay.toISOString().split('T')[0],
        worklog,
      },
      'Worklog calculated'
    );

    return worklog;
  }

  async saveWorklog(employeeId: string, date: Date, worklog: WorklogCalculation): Promise<void> {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    // Upsert DailyWorklog
    await prisma.dailyWorklog.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: dateOnly,
        },
      },
      update: {
        workedMinutes: worklog.workedMinutes,
        lateMinutes: worklog.lateMinutes,
        extraMinutes: worklog.extraMinutes,
        underMinutes: worklog.underMinutes,
        status: worklog.isIncomplete ? 'ERROR' : 'PROCESSED',
      },
      create: {
        employeeId,
        date: dateOnly,
        workedMinutes: worklog.workedMinutes,
        lateMinutes: worklog.lateMinutes,
        extraMinutes: worklog.extraMinutes,
        underMinutes: worklog.underMinutes,
        status: worklog.isIncomplete ? 'ERROR' : 'PROCESSED',
      },
    });

    // Cria ocorrências
    for (const occurrence of worklog.occurrences) {
      await prisma.occurrence.create({
        data: {
          employeeId,
          date: dateOnly,
          type: occurrence.type as PrismaOccurrenceType,
          minutes: occurrence.minutes,
          status: 'OPEN',
        },
      });
    }

    logger.info(
      {
        employeeId,
        date: dateOnly.toISOString().split('T')[0],
        occurrences: worklog.occurrences.length,
      },
      'Worklog and occurrences saved'
    );
  }

  async processDayForAllEmployees(date: Date): Promise<{
    processed: number;
    errors: number;
  }> {
    const employees = await prisma.employee.findMany({
      where: { active: true },
    });

    let processed = 0;
    let errors = 0;

    for (const employee of employees) {
      try {
        const worklog = await this.processDay(employee.id, date);
        await this.saveWorklog(employee.id, date, worklog);
        processed++;
      } catch (error) {
        logger.error(
          {
            employeeId: employee.id,
            error,
          },
          'Failed to process worklog for employee'
        );
        errors++;
      }
    }

    return { processed, errors };
  }
}

export const worklogService = new WorklogService();
