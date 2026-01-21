import cron from 'node-cron';
import type { App } from '@slack/bolt';
import { apiClient } from '../services/apiClient.js';
import {
  buildOccurrenceNotificationBlocks,
  buildDailySummaryBlocks,
} from '../services/messages.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { getTodayDateString, isWeekday } from '../utils/dates.js';
import type { Employee, Occurrence } from '@controle-ponto/types';

export function startDailySummaryJob(app: App): void {
  const cronExpression = env.DAILY_SUMMARY_CRON;

  logger.info({ cron: cronExpression }, 'Starting daily summary job scheduler');

  cron.schedule(cronExpression, async () => {
    if (!isWeekday()) {
      logger.info('Skipping daily summary - weekend');
      return;
    }

    logger.info('Daily summary job started');

    try {
      const today = getTodayDateString();

      // Busca todas as ocorrências abertas de hoje
      const occurrences = await apiClient.getOccurrences({
        date: today,
        status: 'OPEN',
      });

      if (occurrences.length === 0) {
        logger.info('No open occurrences found for today');
        return;
      }

      logger.info({ count: occurrences.length }, 'Found open occurrences');

      // Busca funcionários para mapear slackUserId
      const employees = await apiClient.getEmployees();
      const employeeMap = new Map<string, Employee>();
      employees.forEach((e) => {
        employeeMap.set(e.id, e);
      });

      // Agrupa ocorrências por funcionário
      const occurrencesByEmployee = new Map<string, Occurrence[]>();
      for (const occ of occurrences) {
        const existing = occurrencesByEmployee.get(occ.employeeId) || [];
        existing.push(occ);
        occurrencesByEmployee.set(occ.employeeId, existing);
      }

      // Envia resumo para cada colaborador
      for (const [employeeId, empOccurrences] of occurrencesByEmployee) {
        const employee = employeeMap.get(employeeId);

        if (!employee?.slackUserId) {
          logger.warn({ employeeId }, 'Employee has no slackUserId');
          continue;
        }

        try {
          // Se tem apenas uma ocorrência, envia detalhada
          if (empOccurrences.length === 1) {
            const blocks = buildOccurrenceNotificationBlocks({
              ...empOccurrences[0],
              employee: { name: employee.name },
            });

            await app.client.chat.postMessage({
              channel: employee.slackUserId,
              text: `Você tem uma ocorrência pendente de hoje.`,
              blocks,
            });
          } else {
            // Se tem várias, envia resumo
            const summaryBlocks = buildDailySummaryBlocks(empOccurrences);

            await app.client.chat.postMessage({
              channel: employee.slackUserId,
              text: `Você tem ${empOccurrences.length} ocorrência(s) pendente(s) de hoje.`,
              blocks: summaryBlocks,
            });

            // E depois envia cada uma individualmente
            for (const occ of empOccurrences) {
              const blocks = buildOccurrenceNotificationBlocks({
                ...occ,
                employee: { name: employee.name },
              });

              await app.client.chat.postMessage({
                channel: employee.slackUserId,
                text: `Detalhes da ocorrência`,
                blocks,
              });
            }
          }

          logger.info(
            {
              employeeId: employee.id,
              slackUserId: employee.slackUserId,
              occurrenceCount: empOccurrences.length,
            },
            'Daily summary sent'
          );
        } catch (error) {
          logger.error(
            {
              error,
              employeeId: employee.id,
            },
            'Failed to send daily summary'
          );
        }
      }

      logger.info('Daily summary job completed');
    } catch (error) {
      logger.error({ error }, 'Daily summary job failed');
    }
  });
}
