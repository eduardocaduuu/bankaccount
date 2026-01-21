import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../config/env.js';
import { createSolidesAdapter } from '../integrations/solides/adapter.js';
import { SyncService } from '../services/sync.service.js';
import type { ApiResponse, SyncResponse } from '@controle-ponto/types';

const syncQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato deve ser YYYY-MM-DD'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato deve ser YYYY-MM-DD'),
});

export async function integrationsRoutes(app: FastifyInstance) {
  const solidesAdapter = createSolidesAdapter({
    baseUrl: env.SOLIDES_BASE_URL,
    apiKey: env.SOLIDES_API_KEY,
    apiKeyHeaderName: env.SOLIDES_API_KEY_HEADER_NAME,
    employeesPath: env.SOLIDES_EMPLOYEES_PATH,
    punchesPath: env.SOLIDES_PUNCHES_PATH,
  });

  const syncService = new SyncService(solidesAdapter);

  // POST /integrations/solides/test
  app.post('/integrations/solides/test', async (request, reply) => {
    try {
      const isConnected = await solidesAdapter.testConnection();

      if (isConnected) {
        return {
          success: true,
          message: 'Conexão com Sólides estabelecida com sucesso',
        };
      } else {
        return reply.status(503).send({
          success: false,
          error: 'Não foi possível conectar ao Sólides',
        });
      }
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro ao testar conexão',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  });

  // POST /integrations/solides/sync
  app.post<{ Querystring: { start: string; end: string } }>(
    '/integrations/solides/sync',
    async (request, reply) => {
      const result = syncQuerySchema.safeParse(request.query);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'Parâmetros inválidos',
          message: result.error.message,
        });
      }

      const { start, end } = result.data;

      // Validar que start <= end
      if (new Date(start) > new Date(end)) {
        return reply.status(400).send({
          success: false,
          error: 'Data de início deve ser menor ou igual à data de fim',
        });
      }

      try {
        const syncResult = await syncService.fullSync(start, end);

        return {
          success: true,
          data: syncResult,
          message: 'Sincronização concluída',
        };
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: 'Erro durante sincronização',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }
  );

  // GET /integrations/solides/config
  app.get('/integrations/solides/config', async () => {
    return {
      success: true,
      data: {
        baseUrl: env.SOLIDES_BASE_URL,
        employeesPath: env.SOLIDES_EMPLOYEES_PATH,
        punchesPath: env.SOLIDES_PUNCHES_PATH,
        // Não expõe API key
      },
    };
  });
}
