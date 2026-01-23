import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../config/env.js';
import { createSolidesAdapter } from '../integrations/solides/adapter.js';
import { SyncService } from '../services/sync.service.js';
import type { ApiResponse, SyncResponse } from '@controle-ponto/types';
import { logger } from '../utils/logger.js';

// ===========================================
// ROTAS DE INTEGRAÇÃO - TANGERINO/SÓLIDES
// ===========================================
//
// IMPORTANTE: Integração READ-ONLY (Somente Leitura)
//
// Estas rotas APENAS consultam dados do Tangerino:
// - Funcionários
// - Marcações de ponto
//
// NENHUM dado é enviado de volta para o Tangerino.
// O ponto oficial continua sendo o do Tangerino/Sólides.
//
// ===========================================

const syncQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato deve ser YYYY-MM-DD'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato deve ser YYYY-MM-DD'),
});

export async function integrationsRoutes(app: FastifyInstance) {
  const solidesAdapter = createSolidesAdapter({
    baseUrl: env.SOLIDES_BASE_URL,
    punchesBaseUrl: env.SOLIDES_PUNCHES_BASE_URL,
    apiKey: env.SOLIDES_API_KEY,
    apiKeyHeaderName: env.SOLIDES_API_KEY_HEADER_NAME,
    employeesPath: env.SOLIDES_EMPLOYEES_PATH,
    punchesPath: env.SOLIDES_PUNCHES_PATH,
  });

  const syncService = new SyncService(solidesAdapter);

  // ===========================================
  // POST /integrations/solides/test
  // ===========================================
  // Testa conexão com Tangerino (somente leitura)
  // Executa um GET simples para verificar autenticação
  // ===========================================
  app.post('/integrations/solides/test', async (request, reply) => {
    logger.info('[READ-ONLY] Iniciando teste de conexão com Tangerino');

    try {
      const isConnected = await solidesAdapter.testConnection();

      if (isConnected) {
        logger.info('[READ-ONLY] Teste de conexão bem-sucedido - Nenhum dado enviado para Tangerino');
        return {
          success: true,
          message: 'Conexão com Tangerino estabelecida com sucesso (somente leitura)',
          mode: 'READ-ONLY',
          warning: 'Esta integração apenas consulta dados. Nenhuma alteração é enviada para o Tangerino.',
        };
      } else {
        logger.warn('[READ-ONLY] Teste de conexão falhou');
        return reply.status(503).send({
          success: false,
          error: 'Não foi possível conectar ao Tangerino',
          mode: 'READ-ONLY',
        });
      }
    } catch (error) {
      logger.error({ error }, '[READ-ONLY] Erro ao testar conexão com Tangerino');
      return reply.status(500).send({
        success: false,
        error: 'Erro ao testar conexão',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        mode: 'READ-ONLY',
      });
    }
  });

  // ===========================================
  // POST /integrations/solides/sync
  // ===========================================
  // Sincroniza dados DO Tangerino PARA o banco local
  // - Busca funcionários (GET)
  // - Busca marcações (GET)
  // - Salva no banco local
  // - NÃO envia nada de volta para o Tangerino
  // ===========================================
  app.post<{ Querystring: { start: string; end: string } }>(
    '/integrations/solides/sync',
    async (request, reply) => {
      logger.info(
        { query: request.query },
        '[READ-ONLY] Iniciando sincronização - Dados serão APENAS consultados do Tangerino'
      );

      const result = syncQuerySchema.safeParse(request.query);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'Parâmetros inválidos',
          message: result.error.message,
          mode: 'READ-ONLY',
        });
      }

      const { start, end } = result.data;

      // Validar que start <= end
      if (new Date(start) > new Date(end)) {
        return reply.status(400).send({
          success: false,
          error: 'Data de início deve ser menor ou igual à data de fim',
          mode: 'READ-ONLY',
        });
      }

      try {
        logger.info(
          { start, end },
          '[READ-ONLY] Executando sincronização - Consulta de funcionários e marcações'
        );

        const syncResult = await syncService.fullSync(start, end);

        logger.info(
          {
            ...syncResult,
            start,
            end,
          },
          '[READ-ONLY] Sincronização concluída - Nenhuma alteração foi enviada para o Tangerino'
        );

        return {
          success: true,
          data: syncResult,
          message: 'Sincronização concluída (somente leitura)',
          mode: 'READ-ONLY',
          warning: 'Dados foram apenas consultados e salvos localmente. Nenhuma alteração foi enviada para o Tangerino.',
        };
      } catch (error) {
        logger.error(
          { error, start, end },
          '[READ-ONLY] Erro durante sincronização'
        );
        return reply.status(500).send({
          success: false,
          error: 'Erro durante sincronização',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          mode: 'READ-ONLY',
        });
      }
    }
  );

  // ===========================================
  // GET /integrations/solides/config
  // ===========================================
  // Retorna configuração atual (sem expor API key)
  // ===========================================
  app.get('/integrations/solides/config', async () => {
    return {
      success: true,
      data: {
        baseUrl: env.SOLIDES_BASE_URL,
        employeesPath: env.SOLIDES_EMPLOYEES_PATH,
        punchesPath: env.SOLIDES_PUNCHES_PATH,
        mode: 'READ-ONLY',
        // Não expõe API key por segurança
      },
      warning: 'Esta integração é somente leitura. Nenhum dado é enviado para o Tangerino.',
    };
  });

  // ===========================================
  // GET /integrations/solides/status
  // ===========================================
  // Retorna status da integração e modo de operação
  // ===========================================
  app.get('/integrations/solides/status', async () => {
    return {
      success: true,
      data: {
        mode: 'READ-ONLY',
        description: 'Integração somente leitura com Tangerino/Sólides',
        capabilities: {
          readEmployees: true,
          readPunches: true,
          writeEmployees: false,
          writePunches: false,
          adjustPunches: false,
          deletePunches: false,
        },
        allowedHttpMethods: ['GET'],
        blockedHttpMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
      },
      warning: 'Este sistema NÃO altera o ponto oficial. O ponto oficial é o do Tangerino/Sólides.',
    };
  });
}
