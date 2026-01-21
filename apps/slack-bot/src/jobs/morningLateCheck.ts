import cron from 'node-cron';
import type { App } from '@slack/bolt';
import { apiClient } from '../services/apiClient.js';
import { buildOccurrenceNotificationBlocks } from '../services/messages.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { getTodayDateString, isWeekday } from '../utils/dates.js';
import type { Occurrence, Employee } from '@controle-ponto/types';

export function startMorningLateCheckJob(app: App): void {
  const cronExpression = env.MORNING_LATE_CHECK_CRON;

  logger.info({ cron: cronExpression }, 'Starting morning late check job scheduler');

  cron.schedule(cronExpression, async () => {
    if (!isWeekday()) {
      logger.info('Skipping morning late check - weekend');
      return;
    }

    logger.info('Morning late check started');

    try {
      const today = getTodayDateString();

      // Busca ocorrências LATE abertas de hoje
      const occurrences = await apiClient.getOccurrences({
        date: today,
        status: 'OPEN',
      });

      const lateOccurrences = occurrences.filter((o) => o.type === 'LATE');

      if (lateOccurrences.length === 0) {
        logger.info('No late occurrences found');
        return;
      }

      logger.info({ count: lateOccurrences.length }, 'Found late occurrences');

      // Busca funcionários para mapear slackUserId
      const employees = await apiClient.getEmployees();
      const employeeMap = new Map<string, Employee>();
      employees.forEach((e) => {
        employeeMap.set(e.id, e);
      });

      // Envia DM para cada colaborador com atraso
      for (const occurrence of lateOccurrences) {
        const employee = employeeMap.get(occurrence.employeeId);

        if (!employee?.slackUserId) {
          logger.warn(
            { employeeId: occurrence.employeeId },
            'Employee has no slackUserId'
          );
          continue;
        }

        try {
          const blocks = buildOccurrenceNotificationBlocks({
            ...occurrence,
            employee: { name: employee.name },
          });

          await app.client.chat.postMessage({
            channel: employee.slackUserId,
            text: `Você tem uma ocorrência de atraso registrada hoje.`,
            blocks,
          });

          logger.info(
            {
              employeeId: employee.id,
              slackUserId: employee.slackUserId,
              occurrenceId: occurrence.id,
            },
            'Late notification sent'
          );
        } catch (error) {
          logger.error(
            {
              error,
              employeeId: employee.id,
            },
            'Failed to send late notification'
          );
        }
      }

      logger.info('Morning late check completed');
    } catch (error) {
      logger.error({ error }, 'Morning late check failed');
    }
  });
}
