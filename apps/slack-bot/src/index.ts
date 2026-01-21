import 'dotenv/config';
import { App, LogLevel } from '@slack/bolt';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { registerActionHandlers } from './handlers/actions.js';
import { registerModalHandlers } from './handlers/modals.js';
import { startMorningLateCheckJob } from './jobs/morningLateCheck.js';
import { startDailySummaryJob } from './jobs/dailySummary.js';

const app = new App({
  token: env.SLACK_BOT_TOKEN,
  signingSecret: env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: env.SLACK_APP_TOKEN,
  logLevel: env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
});

// Register handlers
registerActionHandlers(app);
registerModalHandlers(app);

// Health check command
app.command('/ponto-status', async ({ ack, respond }) => {
  await ack();
  await respond({
    text: ':white_check_mark: Bot de controle de ponto está funcionando!',
  });
});

// Start app
const start = async () => {
  try {
    await app.start();

    logger.info(
      {
        env: env.NODE_ENV,
        socketMode: true,
      },
      'Slack bot started'
    );

    // Start jobs
    if (env.NODE_ENV !== 'test') {
      startMorningLateCheckJob(app);
      startDailySummaryJob(app);
    }
  } catch (error) {
    logger.error({ error }, 'Error starting Slack bot');
    process.exit(1);
  }
};

start();
