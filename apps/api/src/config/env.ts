import { z } from 'zod';

const envSchema = z.object({
  // Server
  API_PORT: z.string().default('3001').transform(Number),
  API_HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string(),

  // Auth
  API_INTERNAL_TOKEN: z.string().min(10),

  // Sólides/Tangerino
  SOLIDES_BASE_URL: z.string().url(), // URL para funcionários (employer.tangerino.com.br)
  SOLIDES_PUNCHES_BASE_URL: z.string().url().optional(), // URL para punches (apis.tangerino.com.br/punch) - se não definido, usa SOLIDES_BASE_URL
  SOLIDES_API_KEY: z.string().min(1),
  SOLIDES_API_KEY_HEADER_NAME: z.string().default('Authorization'),
  SOLIDES_EMPLOYEES_PATH: z.string().default('/employee/find-all'),
  SOLIDES_PUNCHES_PATH: z.string().default('/'),

  // Jobs
  DAILY_CLOSE_CRON: z.string().default('30 18 * * 1-5'),

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
