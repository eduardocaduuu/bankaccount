import { z } from 'zod';

const envSchema = z.object({
  // Slack
  SLACK_BOT_TOKEN: z.string().startsWith('xoxb-'),
  SLACK_SIGNING_SECRET: z.string().min(1),
  SLACK_APP_TOKEN: z.string().startsWith('xapp-'),

  // API
  API_BASE_URL: z.string().url(),
  API_INTERNAL_TOKEN: z.string().min(10),

  // HR (optional)
  HR_SLACK_USER_ID: z.string().optional(),
  HR_CHANNEL_ID: z.string().optional(),

  // Jobs
  MORNING_LATE_CHECK_CRON: z.string().default('20 8 * * 1-5'),
  DAILY_SUMMARY_CRON: z.string().default('5 18 * * 1-5'),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Timezone
  TZ: z.string().default('America/Maceio'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    console.error(error.flatten().fieldErrors);
    process.exit(1);
  }
  throw error;
}

export { env };
