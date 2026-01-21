import type { FastifyInstance } from 'fastify';
import { prisma } from '@controle-ponto/db';
import type { HealthCheckResponse } from '@controle-ponto/types';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (): Promise<HealthCheckResponse> => {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbStatus,
    };
  });
}
