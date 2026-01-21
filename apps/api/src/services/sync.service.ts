import { prisma, type PunchType } from '@controle-ponto/db';
import type { SolidesAdapter, SyncResponse } from '@controle-ponto/types';
import { logger } from '../utils/logger.js';
import { worklogService } from './worklog.service.js';

export class SyncService {
  private adapter: SolidesAdapter;

  constructor(adapter: SolidesAdapter) {
    this.adapter = adapter;
  }

  async syncEmployees(): Promise<number> {
    const solidesEmployees = await this.adapter.fetchEmployees();

    let synced = 0;

    for (const emp of solidesEmployees) {
      try {
        // Tenta encontrar setor padrão ou cria um
        let defaultSector = await prisma.sector.findFirst({
          where: { name: 'Geral' },
        });

        if (!defaultSector) {
          defaultSector = await prisma.sector.create({
            data: {
              name: 'Geral',
              managerSlackUserId: 'PENDING',
            },
          });
        }

        await prisma.employee.upsert({
          where: { solidesEmployeeId: emp.id },
          update: {
            name: emp.name,
          },
          create: {
            name: emp.name,
            solidesEmployeeId: emp.id,
            sectorId: defaultSector.id,
          },
        });

        synced++;
      } catch (error) {
        logger.error(
          { employeeId: emp.id, error },
          'Failed to sync employee'
        );
      }
    }

    logger.info({ synced }, 'Employees synced');
    return synced;
  }

  async syncPunches(startDate: string, endDate: string): Promise<number> {
    const solidesPunches = await this.adapter.fetchPunches(startDate, endDate);

    let synced = 0;

    for (const punch of solidesPunches) {
      try {
        // Busca employee pelo solidesEmployeeId
        const employee = await prisma.employee.findUnique({
          where: { solidesEmployeeId: punch.employeeId },
        });

        if (!employee) {
          logger.warn(
            { solidesEmployeeId: punch.employeeId },
            'Employee not found for punch'
          );
          continue;
        }

        const timestamp = new Date(punch.timestamp);

        // Determina tipo de marcação
        let punchType: PunchType = 'ENTRY';
        if (punch.type) {
          const typeUpper = punch.type.toUpperCase();
          if (typeUpper.includes('EXIT') || typeUpper.includes('SAIDA') || typeUpper.includes('SAÍDA')) {
            punchType = 'EXIT';
          }
        }

        // Verifica se já existe essa marcação
        const existing = await prisma.punchEvent.findFirst({
          where: {
            employeeId: employee.id,
            timestamp,
          },
        });

        if (!existing) {
          await prisma.punchEvent.create({
            data: {
              employeeId: employee.id,
              timestamp,
              type: punchType,
              sourcePayloadJson: JSON.stringify(punch),
            },
          });
          synced++;
        }
      } catch (error) {
        logger.error({ punch, error }, 'Failed to sync punch');
      }
    }

    logger.info({ synced }, 'Punches synced');
    return synced;
  }

  async fullSync(startDate: string, endDate: string): Promise<SyncResponse> {
    logger.info({ startDate, endDate }, 'Starting full sync');

    // 1. Sync employees
    const employeesSynced = await this.syncEmployees();

    // 2. Sync punches
    const punchesSynced = await this.syncPunches(startDate, endDate);

    // 3. Process worklogs for the date range
    let worklogsGenerated = 0;
    let occurrencesGenerated = 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const result = await worklogService.processDayForAllEmployees(new Date(d));
      worklogsGenerated += result.processed;

      // Count occurrences
      const occs = await prisma.occurrence.count({
        where: {
          date: new Date(d),
          createdAt: {
            gte: new Date(Date.now() - 60000), // Last minute
          },
        },
      });
      occurrencesGenerated += occs;
    }

    logger.info(
      {
        employeesSynced,
        punchesSynced,
        worklogsGenerated,
        occurrencesGenerated,
      },
      'Full sync completed'
    );

    return {
      employeesSynced,
      punchesSynced,
      worklogsGenerated,
      occurrencesGenerated,
    };
  }
}
