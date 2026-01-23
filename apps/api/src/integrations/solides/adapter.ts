import type { SolidesAdapter, SolidesEmployee, SolidesPunch, TangerinoDailySummary } from '@controle-ponto/types';
import { logger } from '../../utils/logger.js';

// ===========================================
// TANGERINO/SÓLIDES READ-ONLY ADAPTER
// ===========================================
//
// IMPORTANTE: Esta integração é SOMENTE LEITURA (READ-ONLY)
//
// - Utiliza APENAS requisições GET
// - NÃO envia dados para a Sólides/Tangerino
// - NÃO altera, cria ou exclui marcações de ponto
// - O ponto oficial continua sendo o da Sólides/Tangerino
// - Este sistema é apenas para análise interna de banco de horas
//
// API Principal: https://apis.tangerino.com.br/punch
// Endpoint: GET /daily-summary/
//
// ENDPOINTS PROIBIDOS (nunca serão chamados):
// - POST/PUT/PATCH/DELETE para qualquer recurso
// - /adjustment, /record, /insert, /update, /delete
// - /justify, /manual-punch, /correction
//
// ===========================================

export interface TangerinoConfig {
  baseUrl: string;              // URL para funcionários (employer.tangerino.com.br)
  punchesBaseUrl: string;       // URL para punches (apis.tangerino.com.br/punch)
  apiKey: string;
  apiKeyHeaderName: string;
  employeesPath: string;
  punchesPath: string;          // Path para daily-summary (/daily-summary/)
}

/**
 * Métodos HTTP permitidos nesta integração READ-ONLY
 */
const ALLOWED_HTTP_METHODS = ['GET'] as const;
type AllowedMethod = typeof ALLOWED_HTTP_METHODS[number];

/**
 * Palavras-chave de endpoints PROIBIDOS
 * Se a URL contiver qualquer uma dessas palavras, a requisição será bloqueada
 */
const FORBIDDEN_ENDPOINT_KEYWORDS = [
  'adjustment',
  'adjust',
  'record',
  'insert',
  'update',
  'delete',
  'remove',
  'justify',
  'justification',
  'manual',
  'correction',
  'edit',
  'create',
  'modify',
  'write',
  'post',
  'put',
  'patch',
  'register',
] as const;

/**
 * Converte data string (YYYY-MM-DD) para timestamp em milissegundos
 */
function dateToTimestamp(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00');
  return date.getTime();
}

/**
 * Adapter READ-ONLY para integração com Tangerino/Sólides
 *
 * Esta classe implementa proteções rígidas para garantir que:
 * 1. Apenas requisições GET são permitidas
 * 2. Endpoints de escrita são bloqueados
 * 3. Nenhum dado é enviado para a API externa
 */
export class TangerinoReadOnlyAdapter implements SolidesAdapter {
  private config: TangerinoConfig;

  constructor(config: TangerinoConfig) {
    this.config = config;
    logger.info(
      {
        baseUrl: config.baseUrl,
        punchesBaseUrl: config.punchesBaseUrl,
        punchesPath: config.punchesPath
      },
      '[READ-ONLY] Adapter Tangerino inicializado - Integração somente leitura'
    );
  }

  /**
   * Valida se o método HTTP é permitido (somente GET)
   */
  private validateMethod(method: string): asserts method is AllowedMethod {
    if (!ALLOWED_HTTP_METHODS.includes(method as AllowedMethod)) {
      const errorMsg = `[SEGURANÇA] Método HTTP "${method}" BLOQUEADO. Esta integração é READ-ONLY e permite apenas GET.`;
      logger.error({ method, allowedMethods: ALLOWED_HTTP_METHODS }, errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Valida se a URL não contém endpoints proibidos
   */
  private validateEndpoint(url: string): void {
    const urlLower = url.toLowerCase();

    for (const keyword of FORBIDDEN_ENDPOINT_KEYWORDS) {
      if (urlLower.includes(keyword)) {
        const errorMsg = `[SEGURANÇA] Endpoint "${url}" BLOQUEADO. Contém palavra-chave proibida: "${keyword}". Esta integração é READ-ONLY.`;
        logger.error({ url, keyword }, errorMsg);
        throw new Error(errorMsg);
      }
    }
  }

  /**
   * Executa requisição segura (somente GET, sem body)
   */
  private async secureRequest(url: string): Promise<Response> {
    const method = 'GET';

    // Validações de segurança
    this.validateMethod(method);
    this.validateEndpoint(url);

    logger.info(
      { url, method },
      '[READ-ONLY] Executando consulta segura - Nenhum dado será enviado para o Tangerino'
    );

    const response = await fetch(url, {
      method,
      headers: {
        [this.config.apiKeyHeaderName]: this.config.apiKey,
        'Content-Type': 'application/json',
      },
      // SEGURANÇA: Nunca incluir body em requisições
      body: undefined,
    });

    logger.info(
      { url, status: response.status, statusText: response.statusText },
      '[READ-ONLY] Resposta recebida do Tangerino'
    );

    return response;
  }

  /**
   * Testa conexão com a API de daily-summary (somente leitura)
   * Usa parâmetros mock para verificar se a autenticação funciona
   */
  async testConnection(): Promise<boolean> {
    try {
      // Usa o endpoint /daily-summary/ com parâmetros mock para testar
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const todayTimestamp = dateToTimestamp(todayStr);

      const url = new URL(`${this.config.punchesBaseUrl}${this.config.punchesPath}`);
      url.searchParams.set('startDate', todayTimestamp.toString());
      url.searchParams.set('endDate', todayTimestamp.toString());
      url.searchParams.set('reprocess', 'false');

      logger.info(
        { url: url.toString() },
        '[READ-ONLY] Testando conexão com Tangerino /daily-summary/ - Consulta de verificação'
      );

      const response = await this.secureRequest(url.toString());

      if (response.ok) {
        const data = await response.json();
        logger.info(
          { status: response.status, recordCount: Array.isArray(data) ? data.length : 0 },
          '[READ-ONLY] Conexão com Tangerino estabelecida com sucesso'
        );
        return true;
      } else {
        const errorText = await response.text();
        logger.warn(
          { status: response.status, statusText: response.statusText, error: errorText },
          '[READ-ONLY] Conexão com Tangerino falhou'
        );
        return false;
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error },
        '[READ-ONLY] Erro ao testar conexão com Tangerino'
      );
      return false;
    }
  }

  /**
   * Busca lista de funcionários (somente leitura)
   * NÃO cria, altera ou exclui funcionários na Sólides
   */
  async fetchEmployees(): Promise<SolidesEmployee[]> {
    try {
      const url = `${this.config.baseUrl}${this.config.employeesPath}`;

      logger.info(
        { url },
        '[READ-ONLY] Buscando funcionários do Tangerino - Somente consulta'
      );

      const response = await this.secureRequest(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as Record<string, unknown>;

      // Adapta a resposta - formato pode variar conforme API Tangerino
      const rawEmployees = Array.isArray(data)
        ? data
        : (data.employees || data.data || data.items || data.content || []);

      const employees = rawEmployees as Record<string, unknown>[];

      logger.info(
        { count: employees.length },
        '[READ-ONLY] Funcionários consultados do Tangerino - Nenhuma alteração realizada'
      );

      return employees.map((emp) => ({
        id: String(emp.id || emp.employee_id || emp.employeeId || emp.codigo),
        name: String(emp.name || emp.full_name || emp.fullName || emp.nome || 'Desconhecido'),
        email: emp.email ? String(emp.email) : undefined,
        department: emp.department || emp.departamento ? String(emp.department || emp.departamento) : undefined,
        ...emp,
      }));
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error },
        '[READ-ONLY] Erro ao buscar funcionários do Tangerino'
      );
      throw error;
    }
  }

  /**
   * Busca resumo diário de ponto (somente leitura)
   * Endpoint: GET /daily-summary/
   *
   * Retorna cálculos de:
   * - Horas trabalhadas
   * - Saldo de horas
   * - Atrasos
   * - Horas extras
   *
   * NÃO altera nenhuma marcação de ponto
   */
  async fetchDailySummary(
    employeeId: number,
    startDate: string,
    endDate: string
  ): Promise<TangerinoDailySummary[]> {
    try {
      const startTimestamp = dateToTimestamp(startDate);
      const endTimestamp = dateToTimestamp(endDate);

      const url = new URL(`${this.config.punchesBaseUrl}${this.config.punchesPath}`);
      url.searchParams.set('employeeId', employeeId.toString());
      url.searchParams.set('startDate', startTimestamp.toString());
      url.searchParams.set('endDate', endTimestamp.toString());
      url.searchParams.set('reprocess', 'false');

      logger.info(
        {
          url: url.toString(),
          employeeId,
          startDate,
          endDate,
          startTimestamp,
          endTimestamp
        },
        '[READ-ONLY] Buscando resumo diário do Tangerino - Somente consulta'
      );

      const response = await this.secureRequest(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as Record<string, unknown>;

      // Adapta a resposta
      const rawSummaries = Array.isArray(data)
        ? data
        : ((data.content || data.data || data.items || []) as Record<string, unknown>[]);

      logger.info(
        { count: rawSummaries.length, employeeId, startDate, endDate },
        '[READ-ONLY] Resumo diário consultado do Tangerino - Nenhuma alteração enviada'
      );

      return rawSummaries.map((summary: Record<string, unknown>) => ({
        id: Number(summary.id || 0),
        employeeId: Number(summary.employeeId || employeeId),
        employerId: Number(summary.employerId || 0),
        date: String(summary.date || ''),
        workedHours: Number(summary.workedHours || 0),
        hoursBalance: Number(summary.hoursBalance || 0),
        estimatedHours: Number(summary.estimatedHours || 0),
        overtimeTypeOne: Number(summary.overtimeTypeOne || 0),
        overtimeTypeTwo: Number(summary.overtimeTypeTwo || 0),
        overtimeTypeThree: Number(summary.overtimeTypeThree || 0),
        overtimeTypeFour: Number(summary.overtimeTypeFour || 0),
        nightHours: Number(summary.nightHours || 0),
        paidHours: Number(summary.paidHours || 0),
        fictaHours: Number(summary.fictaHours || 0),
        compensatoryHoursBalance: Number(summary.compensatoryHoursBalance || 0),
        overlimitCompensatoryHoursBalance: Number(summary.overlimitCompensatoryHoursBalance || 0),
        isHoliday: Boolean(summary.isHoliday),
        missed: Boolean(summary.missed),
        unjustifiedMiss: Boolean(summary.unjustifiedMiss),
        isAdjustment: Boolean(summary.isAdjustment),
        ...summary,
      }));
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, employeeId, startDate, endDate },
        '[READ-ONLY] Erro ao buscar resumo diário do Tangerino'
      );
      throw error;
    }
  }

  /**
   * Busca marcações de ponto usando o endpoint /daily-summary/
   * Itera por todos os funcionários e consolida os resultados
   *
   * NOTA: Este método é mantido para compatibilidade com a interface SolidesAdapter
   * Internamente usa fetchDailySummary para cada funcionário
   */
  async fetchPunches(startDate: string, endDate: string): Promise<SolidesPunch[]> {
    try {
      logger.info(
        { startDate, endDate },
        '[READ-ONLY] fetchPunches chamado - Usando /daily-summary/ para buscar dados'
      );

      // Para buscar todos os punches, precisamos primeiro buscar os funcionários
      // e depois o daily-summary de cada um
      // Por enquanto, retorna array vazio - use fetchDailySummary diretamente
      logger.warn(
        '[READ-ONLY] fetchPunches: Use fetchDailySummary com employeeId específico para melhores resultados'
      );

      // Tenta buscar daily-summary sem employeeId (se a API suportar)
      const url = new URL(`${this.config.punchesBaseUrl}${this.config.punchesPath}`);
      url.searchParams.set('startDate', dateToTimestamp(startDate).toString());
      url.searchParams.set('endDate', dateToTimestamp(endDate).toString());
      url.searchParams.set('reprocess', 'false');

      const response = await this.secureRequest(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as Record<string, unknown>;
      const rawSummaries = Array.isArray(data)
        ? data
        : ((data.content || data.data || data.items || []) as Record<string, unknown>[]);

      logger.info(
        { count: rawSummaries.length, startDate, endDate },
        '[READ-ONLY] Dados de ponto consultados via /daily-summary/'
      );

      // Converte DailySummary para o formato SolidesPunch para compatibilidade
      return rawSummaries.map((summary) => ({
        employeeId: String(summary.employeeId || ''),
        timestamp: String(summary.date || ''),
        type: 'DAILY_SUMMARY',
        workedHours: summary.workedHours,
        hoursBalance: summary.hoursBalance,
        missed: summary.missed,
        ...summary,
      }));
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error, startDate, endDate },
        '[READ-ONLY] Erro ao buscar marcações de ponto do Tangerino'
      );
      throw error;
    }
  }

  // =====================================================
  // MÉTODOS DE ESCRITA - EXPLICITAMENTE BLOQUEADOS
  // =====================================================
  // Estes métodos existem apenas para documentação e
  // para lançar erro caso alguém tente chamá-los.
  // =====================================================

  /**
   * @deprecated BLOQUEADO - Esta integração é READ-ONLY
   * @throws Error sempre
   */
  async createPunch(): Promise<never> {
    throw new Error(
      '[SEGURANÇA] Método createPunch BLOQUEADO. ' +
      'Esta integração é READ-ONLY e NÃO permite criar marcações de ponto. ' +
      'O ponto oficial deve ser registrado diretamente no Tangerino/Sólides.'
    );
  }

  /**
   * @deprecated BLOQUEADO - Esta integração é READ-ONLY
   * @throws Error sempre
   */
  async updatePunch(): Promise<never> {
    throw new Error(
      '[SEGURANÇA] Método updatePunch BLOQUEADO. ' +
      'Esta integração é READ-ONLY e NÃO permite alterar marcações de ponto. ' +
      'Ajustes de ponto devem ser feitos diretamente no Tangerino/Sólides.'
    );
  }

  /**
   * @deprecated BLOQUEADO - Esta integração é READ-ONLY
   * @throws Error sempre
   */
  async deletePunch(): Promise<never> {
    throw new Error(
      '[SEGURANÇA] Método deletePunch BLOQUEADO. ' +
      'Esta integração é READ-ONLY e NÃO permite excluir marcações de ponto. ' +
      'Exclusões devem ser feitas diretamente no Tangerino/Sólides.'
    );
  }

  /**
   * @deprecated BLOQUEADO - Esta integração é READ-ONLY
   * @throws Error sempre
   */
  async adjustPunch(): Promise<never> {
    throw new Error(
      '[SEGURANÇA] Método adjustPunch BLOQUEADO. ' +
      'Esta integração é READ-ONLY e NÃO permite ajustar marcações de ponto. ' +
      'Ajustes de ponto devem ser feitos diretamente no Tangerino/Sólides.'
    );
  }
}

/**
 * Cria instância do adapter READ-ONLY para Tangerino/Sólides
 */
export function createSolidesAdapter(config: TangerinoConfig): TangerinoReadOnlyAdapter {
  logger.info(
    '[READ-ONLY] Criando adapter Tangerino em modo somente leitura'
  );
  return new TangerinoReadOnlyAdapter(config);
}

// Alias para compatibilidade
export { TangerinoConfig as SolidesConfig };
