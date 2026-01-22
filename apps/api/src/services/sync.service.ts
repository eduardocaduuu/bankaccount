import { prisma, type PunchType } from '@controle-ponto/db';
import type { SolidesAdapter, SyncResponse } from '@controle-ponto/types';
import { logger } from '../utils/logger.js';
import { worklogService } from './worklog.service.js';

// ===========================================
// SERVIÇO DE SINCRONIZAÇÃO - READ-ONLY
// ===========================================
//
// Este serviço APENAS:
// - Consulta dados do Tangerino (via adapter READ-ONLY)
// - Salva dados no banco de dados LOCAL
// - Processa cálculos de banco de horas INTERNAMENTE
//
// Este serviço NUNCA:
// - Envia dados para o Tangerino
// - Altera marcações de ponto no sistema oficial
// - Cria/edita/exclui dados no Tangerino
//
// O ponto oficial continua sendo o do Tangerino/Sólides.
// Este sistema é apenas para análise interna.
//
// ===========================================

export class SyncService {
  private adapter: SolidesAdapter;

  constructor(adapter: SolidesAdapter) {
    this.adapter = adapter;
    logger.info('[READ-ONLY] SyncService inicializado - Modo somente leitura');
  }

  /**
   * Sincroniza funcionários DO Tangerino PARA o banco local
   * - Consulta funcionários via GET
   * - Salva/atualiza no banco LOCAL
   * - NÃO envia dados para o Tangerino
   */
  async syncEmployees(): Promise<number> {
    logger.info('[READ-ONLY] Iniciando sincronização de funcionários - Apenas consulta');

    const solidesEmployees = await this.adapter.fetchEmployees();

    logger.info(
      { count: solidesEmployees.length },
      '[READ-ONLY] Funcionários consultados do Tangerino - Salvando localmente'
    );

    let synced = 0;

    for (const emp of solidesEmployees) {
      try {
        // Tenta encontrar setor padrão ou cria um LOCAL
        let defaultSector = await prisma.sector.findFirst({
          where: { name: 'Geral' },
        });

        if (!defaultSector) {
          defaultSector = await prisma.sector.create({
            data: {
              name: 'Geral',
              managerSlackUserId: 'PENDING',
            },
          });
        }

        // Salva funcionário no banco LOCAL (não envia para Tangerino)
        await prisma.employee.upsert({
          where: { solidesEmployeeId: emp.id },
          update: {
            name: emp.name,
          },
          create: {
            name: emp.name,
            solidesEmployeeId: emp.id,
            sectorId: defaultSector.id,
          },
        });

        synced++;
      } catch (error) {
        logger.error(
          { employeeId: emp.id, error },
          '[READ-ONLY] Erro ao salvar funcionário localmente'
        );
      }
    }

    logger.info(
      { synced },
      '[READ-ONLY] Funcionários sincronizados - Dados salvos apenas localmente, nenhuma alteração no Tangerino'
    );

    return synced;
  }

  /**
   * Sincroniza marcações de ponto DO Tangerino PARA o banco local
   * - Consulta marcações via GET
   * - Salva no banco LOCAL
   * - NÃO envia, altera ou exclui marcações no Tangerino
   */
  async syncPunches(startDate: string, endDate: string): Promise<number> {
    logger.info(
      { startDate, endDate },
      '[READ-ONLY] Iniciando sincronização de marcações - Apenas consulta'
    );

    const solidesPunches = await this.adapter.fetchPunches(startDate, endDate);

    logger.info(
      { count: solidesPunches.length, startDate, endDate },
      '[READ-ONLY] Marcações consultadas do Tangerino - Salvando localmente'
    );

    let synced = 0;

    for (const punch of solidesPunches) {
      try {
        // Busca employee pelo solidesEmployeeId
        const employee = await prisma.employee.findUnique({
          where: { solidesEmployeeId: punch.employeeId },
        });

        if (!employee) {
          logger.warn(
            { solidesEmployeeId: punch.employeeId },
            '[READ-ONLY] Funcionário não encontrado para marcação'
          );
          continue;
        }

        const timestamp = new Date(punch.timestamp);

        // Determina tipo de marcação
        let punchType: PunchType = 'ENTRY';
        if (punch.type) {
          const typeUpper = punch.type.toUpperCase();
          if (typeUpper.includes('EXIT') || typeUpper.includes('SAIDA') || typeUpper.includes('SAÍDA')) {
            punchType = 'EXIT';
          }
        }

        // Verifica se já existe essa marcação no banco LOCAL
        const existing = await prisma.punchEvent.findFirst({
          where: {
            employeeId: employee.id,
            timestamp,
          },
        });

        // Salva marcação no banco LOCAL (não envia para Tangerino)
        if (!existing) {
          await prisma.punchEvent.create({
            data: {
              employeeId: employee.id,
              timestamp,
              type: punchType,
              sourcePayloadJson: JSON.stringify(punch),
            },
          });
          synced++;
        }
      } catch (error) {
        logger.error(
          { punch, error },
          '[READ-ONLY] Erro ao salvar marcação localmente'
        );
      }
    }

    logger.info(
      { synced, startDate, endDate },
      '[READ-ONLY] Marcações sincronizadas - Dados salvos apenas localmente, nenhuma alteração no Tangerino'
    );

    return synced;
  }

  /**
   * Executa sincronização completa (READ-ONLY)
   * 1. Consulta e salva funcionários localmente
   * 2. Consulta e salva marcações localmente
   * 3. Processa worklogs e ocorrências INTERNAMENTE
   *
   * IMPORTANTE: Nenhum dado é enviado para o Tangerino
   */
  async fullSync(startDate: string, endDate: string): Promise<SyncResponse> {
    logger.info(
      { startDate, endDate },
      '[READ-ONLY] ========== INICIANDO SINCRONIZAÇÃO COMPLETA =========='
    );
    logger.info(
      '[READ-ONLY] Modo: SOMENTE LEITURA - Nenhum dado será enviado para o Tangerino'
    );

    // 1. Sync employees (GET do Tangerino → salva local)
    logger.info('[READ-ONLY] Etapa 1/3: Consultando funcionários do Tangerino...');
    const employeesSynced = await this.syncEmployees();

    // 2. Sync punches (GET do Tangerino → salva local)
    logger.info('[READ-ONLY] Etapa 2/3: Consultando marcações do Tangerino...');
    const punchesSynced = await this.syncPunches(startDate, endDate);

    // 3. Process worklogs INTERNAMENTE (cálculos locais apenas)
    logger.info('[READ-ONLY] Etapa 3/3: Processando worklogs internamente...');
    let worklogsGenerated = 0;
    let occurrencesGenerated = 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const result = await worklogService.processDayForAllEmployees(new Date(d));
      worklogsGenerated += result.processed;

      // Count occurrences
      const occs = await prisma.occurrence.count({
        where: {
          date: new Date(d),
          createdAt: {
            gte: new Date(Date.now() - 60000), // Last minute
          },
        },
      });
      occurrencesGenerated += occs;
    }

    logger.info(
      {
        employeesSynced,
        punchesSynced,
        worklogsGenerated,
        occurrencesGenerated,
        startDate,
        endDate,
      },
      '[READ-ONLY] ========== SINCRONIZAÇÃO COMPLETA CONCLUÍDA =========='
    );

    logger.info(
      '[READ-ONLY] CONFIRMAÇÃO: Nenhuma alteração foi enviada para o Tangerino. ' +
      'Todos os dados foram salvos apenas localmente. ' +
      'O ponto oficial continua sendo o do Tangerino/Sólides.'
    );

    return {
      employeesSynced,
      punchesSynced,
      worklogsGenerated,
      occurrencesGenerated,
    };
  }
}
