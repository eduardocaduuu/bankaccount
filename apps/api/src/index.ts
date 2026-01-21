import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { authMiddleware } from './utils/auth.js';
import { healthRoutes } from './routes/health.routes.js';
import { sectorsRoutes } from './routes/sectors.routes.js';
import { employeesRoutes } from './routes/employees.routes.js';
import { occurrencesRoutes } from './routes/occurrences.routes.js';
import { justificationsRoutes } from './routes/justifications.routes.js';
import { integrationsRoutes } from './routes/integrations.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { startDailyCloseJob } from './jobs/daily-close.job.js';

const app = Fastify({
  logger: false, // Usamos pino diretamente
});

// Plugins
await app.register(cors, {
  origin: true,
  credentials: true,
});

// Routes públicas
await app.register(healthRoutes);

// Routes que precisam de autenticação
app.addHook('preHandler', async (request, reply) => {
  // Rotas públicas
  const publicPaths = ['/health'];
  if (publicPaths.includes(request.url)) {
    return;
  }

  // Valida token para outras rotas
  await authMiddleware(request, reply);
});

await app.register(sectorsRoutes);
await app.register(employeesRoutes);
await app.register(occurrencesRoutes);
await app.register(justificationsRoutes);
await app.register(integrationsRoutes);
await app.register(dashboardRoutes);

// Start server
const start = async () => {
  try {
    await app.listen({
      port: env.API_PORT,
      host: env.API_HOST,
    });

    logger.info(
      {
        port: env.API_PORT,
        host: env.API_HOST,
        env: env.NODE_ENV,
      },
      'Server started'
    );

    // Start jobs
    if (env.NODE_ENV !== 'test') {
      startDailyCloseJob();
    }
  } catch (err) {
    logger.error(err, 'Error starting server');
    process.exit(1);
  }
};

start();
