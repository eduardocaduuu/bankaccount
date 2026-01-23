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

  // Sólides/Tangerino - Integração READ-ONLY
  // URL para funcionários (employer.tangerino.com.br) - usado para buscar lista de funcionários
  SOLIDES_BASE_URL: z.string().url(),
  // URL para punches/daily-summary (apis.tangerino.com.br/punch) - OBRIGATÓRIO
  SOLIDES_PUNCHES_BASE_URL: z.string().url(),
  // API Key do Tangerino (token de autenticação)
  SOLIDES_API_KEY: z.string().min(1),
  // Nome do header para enviar a API Key (padrão: Authorization)
  SOLIDES_API_KEY_HEADER_NAME: z.string().default('Authorization'),
  // Path para buscar funcionários
  SOLIDES_EMPLOYEES_PATH: z.string().default('/employee/find-all'),
  // Path para buscar daily-summary (resumo diário de ponto)
  SOLIDES_PUNCHES_PATH: z.string().default('/daily-summary/'),

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
