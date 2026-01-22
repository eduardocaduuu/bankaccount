import type { SolidesAdapter, SolidesEmployee, SolidesPunch } from '@controle-ponto/types';
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
// ENDPOINTS PROIBIDOS (nunca serão chamados):
// - POST/PUT/PATCH/DELETE para qualquer recurso
// - /adjustment, /record, /insert, /update, /delete
// - /justify, /manual-punch, /correction
//
// ===========================================

export interface TangerinoConfig {
  baseUrl: string;
  apiKey: string;
  apiKeyHeaderName: string;
  employeesPath: string;
  punchesPath: string;
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
] as const;

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
      { baseUrl: config.baseUrl },
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
      '[READ-ONLY] Executando consulta segura - Nenhum dado será enviado para a Sólides'
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
      { url, status: response.status },
      '[READ-ONLY] Consulta realizada - Nenhuma alteração enviada para a Sólides'
    );

    return response;
  }

  /**
   * Testa conexão com a API (somente leitura)
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}${this.config.employeesPath}`;

      logger.info(
        { url },
        '[READ-ONLY] Testando conexão com Tangerino - Consulta de verificação'
      );

      const response = await this.secureRequest(url);

      if (response.ok) {
        logger.info('[READ-ONLY] Conexão com Tangerino estabelecida com sucesso');
      } else {
        logger.warn(
          { status: response.status },
          '[READ-ONLY] Conexão com Tangerino falhou'
        );
      }

      return response.ok;
    } catch (error) {
      logger.error(
        { error },
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as Record<string, unknown>;

      // Adapta a resposta - formato pode variar conforme API Tangerino
      const rawEmployees = Array.isArray(data)
        ? data
        : (data.employees || data.data || data.items || []);

      const employees = rawEmployees as Record<string, unknown>[];

      logger.info(
        { count: employees.length },
        '[READ-ONLY] Funcionários consultados do Tangerino - Nenhuma alteração realizada na Sólides'
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
        { error },
        '[READ-ONLY] Erro ao buscar funcionários do Tangerino'
      );
      throw error;
    }
  }

  /**
   * Busca marcações de ponto (somente leitura)
   * NÃO cria, altera, ajusta ou exclui marcações na Sólides
   */
  async fetchPunches(startDate: string, endDate: string): Promise<SolidesPunch[]> {
    try {
      const url = new URL(`${this.config.baseUrl}${this.config.punchesPath}`);
      url.searchParams.set('start', startDate);
      url.searchParams.set('end', endDate);

      logger.info(
        { url: url.toString(), startDate, endDate },
        '[READ-ONLY] Buscando marcações de ponto do Tangerino - Somente consulta'
      );

      const response = await this.secureRequest(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as Record<string, unknown>;

      // Adapta a resposta - formato pode variar conforme API Tangerino
      const rawPunches = Array.isArray(data)
        ? data
        : (data.punches || data.data || data.items || data.marcacoes || []);

      const punches = rawPunches as Record<string, unknown>[];

      logger.info(
        { count: punches.length, startDate, endDate },
        '[READ-ONLY] Marcações de ponto consultadas do Tangerino - Nenhuma alteração enviada para a Sólides'
      );

      return punches.map((punch) => ({
        employeeId: String(
          punch.employee_id ||
          punch.employeeId ||
          punch.funcionario_id ||
          punch.codigo_funcionario ||
          punch.id
        ),
        timestamp: String(
          punch.timestamp ||
          punch.date ||
          punch.punch_time ||
          punch.data_hora ||
          punch.dataHora
        ),
        type: punch.type || punch.tipo ? String(punch.type || punch.tipo) : undefined,
        ...punch,
      }));
    } catch (error) {
      logger.error(
        { error, startDate, endDate },
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
export function createSolidesAdapter(config: TangerinoConfig): SolidesAdapter {
  logger.info(
    '[READ-ONLY] Criando adapter Tangerino em modo somente leitura'
  );
  return new TangerinoReadOnlyAdapter(config);
}

// Alias para compatibilidade
export { TangerinoConfig as SolidesConfig };
