import cron from 'node-cron';
import { worklogService } from '../services/worklog.service.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function startDailyCloseJob(): void {
  const cronExpression = env.DAILY_CLOSE_CRON;

  logger.info({ cron: cronExpression }, 'Starting daily close job scheduler');

  cron.schedule(cronExpression, async () => {
    logger.info('Daily close job started');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await worklogService.processDayForAllEmployees(today);

      logger.info(
        {
          processed: result.processed,
          errors: result.errors,
        },
        'Daily close job completed'
      );
    } catch (error) {
      logger.error({ error }, 'Daily close job failed');
    }
  });
}

// Função para executar manualmente
export async function runDailyClose(date?: Date): Promise<{
  processed: number;
  errors: number;
}> {
  const targetDate = date || new Date();
  targetDate.setHours(0, 0, 0, 0);

  logger.info({ date: targetDate.toISOString() }, 'Running manual daily close');

  return worklogService.processDayForAllEmployees(targetDate);
}
