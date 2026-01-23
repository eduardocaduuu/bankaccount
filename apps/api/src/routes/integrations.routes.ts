import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../config/env.js';
import { createSolidesAdapter } from '../integrations/solides/adapter.js';
import { SyncService } from '../services/sync.service.js';
import type { ApiResponse, SyncResponse, TangerinoDailySummary } from '@controle-ponto/types';
import { logger } from '../utils/logger.js';

// ===========================================
// ROTAS DE INTEGRAÇÃO - TANGERINO/SÓLIDES
// ===========================================
//
// IMPORTANTE: Integração READ-ONLY (Somente Leitura)
//
// Estas rotas APENAS consultam dados do Tangerino:
// - Funcionários (employer.tangerino.com.br)
// - Resumo diário de ponto via /daily-summary/ (apis.tangerino.com.br/punch)
//
// NENHUM dado é enviado de volta para o Tangerino.
// O ponto oficial continua sendo o do Tangerino/Sólides.
//
// ===========================================

const syncQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato deve ser YYYY-MM-DD'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato deve ser YYYY-MM-DD'),
});

const dailySummaryQuerySchema = z.object({
  employeeId: z.string().transform(Number),
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
  // Testa conexão com Tangerino /daily-summary/ (somente leitura)
  // Executa um GET com parâmetros mock para verificar autenticação
  // ===========================================
  app.post('/integrations/solides/test', async (request, reply) => {
    logger.info({
      punchesBaseUrl: env.SOLIDES_PUNCHES_BASE_URL,
      punchesPath: env.SOLIDES_PUNCHES_PATH,
    }, '[READ-ONLY] Iniciando teste de conexão com Tangerino /daily-summary/');

    try {
      const isConnected = await solidesAdapter.testConnection();

      if (isConnected) {
        logger.info('[READ-ONLY] Teste de conexão bem-sucedido - Endpoint /daily-summary/ respondeu');
        return {
          success: true,
          message: 'Conexão com Tangerino /daily-summary/ estabelecida com sucesso (somente leitura)',
          mode: 'READ-ONLY',
          endpoint: `${env.SOLIDES_PUNCHES_BASE_URL}${env.SOLIDES_PUNCHES_PATH}`,
          warning: 'Esta integração apenas consulta dados. Nenhuma alteração é enviada para o Tangerino.',
        };
      } else {
        logger.warn({
          punchesBaseUrl: env.SOLIDES_PUNCHES_BASE_URL,
          punchesPath: env.SOLIDES_PUNCHES_PATH,
        }, '[READ-ONLY] Teste de conexão falhou - Verifique o token e as configurações');
        return reply.status(503).send({
          success: false,
          error: 'Não foi possível conectar ao Tangerino /daily-summary/',
          endpoint: `${env.SOLIDES_PUNCHES_BASE_URL}${env.SOLIDES_PUNCHES_PATH}`,
          mode: 'READ-ONLY',
          hint: 'Verifique se o token está correto e se o endpoint está acessível',
        });
      }
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : error,
        punchesBaseUrl: env.SOLIDES_PUNCHES_BASE_URL,
      }, '[READ-ONLY] Erro ao testar conexão com Tangerino');
      return reply.status(500).send({
        success: false,
        error: 'Erro ao testar conexão',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        mode: 'READ-ONLY',
      });
    }
  });

  // ===========================================
  // GET /integrations/solides/daily-summary
  // ===========================================
  // Busca resumo diário de ponto de um funcionário específico
  // Retorna: horas trabalhadas, saldo, atrasos, extras
  // ===========================================
  app.get<{ Querystring: { employeeId: string; start: string; end: string } }>(
    '/integrations/solides/daily-summary',
    async (request, reply) => {
      logger.info(
        { query: request.query },
        '[READ-ONLY] Buscando resumo diário de ponto'
      );

      const result = dailySummaryQuerySchema.safeParse(request.query);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: 'Parâmetros inválidos',
          message: result.error.message,
          mode: 'READ-ONLY',
          hint: 'Formato: ?employeeId=123&start=YYYY-MM-DD&end=YYYY-MM-DD',
        });
      }

      const { employeeId, start, end } = result.data;

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
          { employeeId, start, end },
          '[READ-ONLY] Consultando /daily-summary/ do Tangerino'
        );

        const dailySummaries = await solidesAdapter.fetchDailySummary(employeeId, start, end);

        logger.info(
          { employeeId, start, end, count: dailySummaries.length },
          '[READ-ONLY] Resumo diário consultado com sucesso'
        );

        return {
          success: true,
          data: dailySummaries,
          meta: {
            employeeId,
            startDate: start,
            endDate: end,
            recordCount: dailySummaries.length,
          },
          mode: 'READ-ONLY',
          warning: 'Dados consultados do Tangerino. Nenhuma alteração foi enviada.',
        };
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : error, employeeId, start, end },
          '[READ-ONLY] Erro ao buscar resumo diário'
        );
        return reply.status(500).send({
          success: false,
          error: 'Erro ao buscar resumo diário',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          mode: 'READ-ONLY',
        });
      }
    }
  );

  // ===========================================
  // POST /integrations/solides/sync
  // ===========================================
  // Sincroniza dados DO Tangerino PARA o banco local
  // - Busca funcionários (GET)
  // - Busca resumo diário via /daily-summary/ (GET)
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
          '[READ-ONLY] Executando sincronização - Consulta via /daily-summary/'
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
          { error: error instanceof Error ? error.message : error, start, end },
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
        punchesBaseUrl: env.SOLIDES_PUNCHES_BASE_URL,
        employeesPath: env.SOLIDES_EMPLOYEES_PATH,
        punchesPath: env.SOLIDES_PUNCHES_PATH,
        endpoints: {
          employees: `${env.SOLIDES_BASE_URL}${env.SOLIDES_EMPLOYEES_PATH}`,
          dailySummary: `${env.SOLIDES_PUNCHES_BASE_URL}${env.SOLIDES_PUNCHES_PATH}`,
        },
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
        apiEndpoints: {
          employees: env.SOLIDES_BASE_URL,
          dailySummary: env.SOLIDES_PUNCHES_BASE_URL,
        },
        capabilities: {
          readEmployees: true,
          readDailySummary: true,
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
