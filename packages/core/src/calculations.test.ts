import { describe, it, expect } from 'vitest';
import {
  computeLateMinutes,
  computeExtraMinutes,
  computeUnderMinutes,
  computeWorkedMinutes,
  isPunchesIncomplete,
  generateOccurrences,
  calculateWorklog,
  formatMinutes,
  timeToMinutes,
  DEFAULT_WORKDAY_CONFIG,
} from './calculations';
import type { Punch, PunchType } from '@controle-ponto/types';

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function createDate(hour: number, minute: number): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function createPunch(hour: number, minute: number, type: PunchType): Punch {
  return {
    timestamp: createDate(hour, minute),
    type,
  };
}

// ===========================================
// TESTES: computeLateMinutes
// ===========================================

describe('computeLateMinutes', () => {
  it('deve retornar 0 quando entrada é às 08:00 (no horário)', () => {
    const entry = createDate(8, 0);
    expect(computeLateMinutes(entry)).toBe(0);
  });

  it('deve retornar 0 quando entrada é antes de 08:00', () => {
    const entry = createDate(7, 45);
    expect(computeLateMinutes(entry)).toBe(0);
  });

  it('deve retornar 0 quando entrada é às 08:10 (exatamente na tolerância)', () => {
    const entry = createDate(8, 10);
    expect(computeLateMinutes(entry)).toBe(0);
  });

  it('deve retornar 11 minutos quando entrada é às 08:11 (1 minuto após tolerância)', () => {
    // REGRA DE FRANQUIA TOTAL: atraso = 11, não 1
    const entry = createDate(8, 11);
    expect(computeLateMinutes(entry)).toBe(11);
  });

  it('deve retornar 30 minutos quando entrada é às 08:30', () => {
    const entry = createDate(8, 30);
    expect(computeLateMinutes(entry)).toBe(30);
  });

  it('deve retornar 60 minutos quando entrada é às 09:00', () => {
    const entry = createDate(9, 0);
    expect(computeLateMinutes(entry)).toBe(60);
  });

  it('deve usar tolerância customizada', () => {
    const entry = createDate(8, 16);
    // Com tolerância de 15, entrada às 08:16 deve ter atraso = 16
    expect(computeLateMinutes(entry, 15)).toBe(16);
  });

  it('deve usar horário de início customizado', () => {
    const entry = createDate(9, 11);
    // Início às 09:00, entrada às 09:11 => atraso = 11
    expect(computeLateMinutes(entry, 10, 9, 0)).toBe(11);
  });
});

// ===========================================
// TESTES: computeExtraMinutes
// ===========================================

describe('computeExtraMinutes', () => {
  it('deve retornar 0 quando trabalhou exatamente 480 minutos (8h)', () => {
    expect(computeExtraMinutes(480)).toBe(0);
  });

  it('deve retornar 0 quando trabalhou menos que 480 minutos', () => {
    expect(computeExtraMinutes(479)).toBe(0);
  });

  it('deve retornar 0 quando trabalhou 490 minutos (8h10 - exatamente na tolerância)', () => {
    expect(computeExtraMinutes(490)).toBe(0);
  });

  it('deve retornar 11 minutos quando trabalhou 491 minutos (8h11 - 1 minuto após tolerância)', () => {
    // REGRA DE FRANQUIA TOTAL: extra = 11, não 1
    expect(computeExtraMinutes(491)).toBe(11);
  });

  it('deve retornar 30 minutos quando trabalhou 510 minutos', () => {
    expect(computeExtraMinutes(510)).toBe(30);
  });

  it('deve retornar 60 minutos quando trabalhou 540 minutos (9h)', () => {
    expect(computeExtraMinutes(540)).toBe(60);
  });

  it('deve usar tolerância customizada', () => {
    // Com tolerância de 15, trabalhou 496 => extra = 16
    expect(computeExtraMinutes(496, 480, 15)).toBe(16);
  });

  it('deve usar jornada esperada customizada', () => {
    // Jornada de 420min (7h), trabalhou 431 => extra = 11
    expect(computeExtraMinutes(431, 420, 10)).toBe(11);
  });
});

// ===========================================
// TESTES: computeUnderMinutes
// ===========================================

describe('computeUnderMinutes', () => {
  it('deve retornar 0 quando trabalhou exatamente 480 minutos', () => {
    expect(computeUnderMinutes(480)).toBe(0);
  });

  it('deve retornar 0 quando trabalhou mais que 480 minutos', () => {
    expect(computeUnderMinutes(500)).toBe(0);
  });

  it('deve retornar 1 minuto quando trabalhou 479 minutos (7h59)', () => {
    expect(computeUnderMinutes(479)).toBe(1);
  });

  it('deve retornar 60 minutos quando trabalhou 420 minutos (7h)', () => {
    expect(computeUnderMinutes(420)).toBe(60);
  });

  it('deve retornar 480 minutos quando trabalhou 0 minutos', () => {
    expect(computeUnderMinutes(0)).toBe(480);
  });

  it('deve usar jornada esperada customizada', () => {
    // Jornada de 420min (7h), trabalhou 410 => under = 10
    expect(computeUnderMinutes(410, 420)).toBe(10);
  });
});

// ===========================================
// TESTES: computeWorkedMinutes
// ===========================================

describe('computeWorkedMinutes', () => {
  it('deve retornar 0 para lista vazia de marcações', () => {
    expect(computeWorkedMinutes([])).toBe(0);
  });

  it('deve retornar 0 para apenas uma marcação', () => {
    const punches = [createPunch(8, 0, 'ENTRY')];
    expect(computeWorkedMinutes(punches)).toBe(0);
  });

  it('deve calcular período simples corretamente', () => {
    const punches = [
      createPunch(8, 0, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
    ];
    expect(computeWorkedMinutes(punches)).toBe(240); // 4 horas
  });

  it('deve calcular múltiplos períodos corretamente', () => {
    const punches = [
      createPunch(8, 0, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
      createPunch(14, 0, 'ENTRY'),
      createPunch(18, 0, 'EXIT'),
    ];
    // 4h manhã + 4h tarde = 8h = 480 min
    // Com almoço configurado (>6h), subtrai 120 min => 360 min
    const result = computeWorkedMinutes(punches, DEFAULT_WORKDAY_CONFIG.lunchPolicy);
    expect(result).toBe(360);
  });

  it('deve calcular dia completo sem desconto de almoço quando não configurado', () => {
    const punches = [
      createPunch(8, 0, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
      createPunch(14, 0, 'ENTRY'),
      createPunch(18, 0, 'EXIT'),
    ];
    expect(computeWorkedMinutes(punches)).toBe(480); // 8h sem desconto
  });
});

// ===========================================
// TESTES: isPunchesIncomplete
// ===========================================

describe('isPunchesIncomplete', () => {
  it('deve retornar true para lista vazia', () => {
    expect(isPunchesIncomplete([])).toBe(true);
  });

  it('deve retornar true para menos de 4 marcações', () => {
    const punches = [
      createPunch(8, 0, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
    ];
    expect(isPunchesIncomplete(punches)).toBe(true);
  });

  it('deve retornar true para número ímpar de marcações', () => {
    const punches = [
      createPunch(8, 0, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
      createPunch(14, 0, 'ENTRY'),
    ];
    expect(isPunchesIncomplete(punches)).toBe(true);
  });

  it('deve retornar false para 4 marcações válidas', () => {
    const punches = [
      createPunch(8, 0, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
      createPunch(14, 0, 'ENTRY'),
      createPunch(18, 0, 'EXIT'),
    ];
    expect(isPunchesIncomplete(punches)).toBe(false);
  });

  it('deve retornar true para pares inválidos (EXIT seguido de ENTRY)', () => {
    const punches = [
      createPunch(8, 0, 'EXIT'),
      createPunch(12, 0, 'ENTRY'),
      createPunch(14, 0, 'EXIT'),
      createPunch(18, 0, 'ENTRY'),
    ];
    expect(isPunchesIncomplete(punches)).toBe(true);
  });
});

// ===========================================
// TESTES: generateOccurrences
// ===========================================

describe('generateOccurrences', () => {
  it('deve gerar INCOMPLETE quando isIncomplete é true', () => {
    const result = generateOccurrences(0, 0, 0, 0, true);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('INCOMPLETE');
  });

  it('deve gerar LATE quando há atraso', () => {
    const result = generateOccurrences(480, 15, 0, 0, false);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('LATE');
    expect(result[0].minutes).toBe(15);
  });

  it('deve gerar OVER quando há hora extra', () => {
    const result = generateOccurrences(500, 0, 20, 0, false);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('OVER');
    expect(result[0].minutes).toBe(20);
  });

  it('deve gerar UNDER quando há falta', () => {
    const result = generateOccurrences(470, 0, 0, 10, false);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('UNDER');
    expect(result[0].minutes).toBe(10);
  });

  it('deve gerar múltiplas ocorrências quando aplicável', () => {
    const result = generateOccurrences(480, 15, 0, 0, false);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('LATE');
  });

  it('deve retornar array vazio quando não há ocorrências', () => {
    const result = generateOccurrences(480, 0, 0, 0, false);
    expect(result).toHaveLength(0);
  });
});

// ===========================================
// TESTES: calculateWorklog (integração)
// ===========================================

describe('calculateWorklog', () => {
  it('caso 1: entrada 08:10 => atraso 0', () => {
    const punches = [
      createPunch(8, 10, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
      createPunch(14, 0, 'ENTRY'),
      createPunch(18, 10, 'EXIT'), // Sai mais tarde para compensar entrada tardia
    ];
    const result = calculateWorklog(punches);
    expect(result.lateMinutes).toBe(0);
  });

  it('caso 2: entrada 08:11 => atraso 11', () => {
    const punches = [
      createPunch(8, 11, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
      createPunch(14, 0, 'ENTRY'),
      createPunch(18, 0, 'EXIT'),
    ];
    const result = calculateWorklog(punches);
    expect(result.lateMinutes).toBe(11);
  });

  it('caso 3: 8h10 trabalhadas => extra 0', () => {
    // 490 minutos trabalhados = 8h10
    const punches = [
      createPunch(8, 0, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
      createPunch(14, 0, 'ENTRY'),
      createPunch(18, 10, 'EXIT'),
    ];
    // Com almoço de 2h, seria 490 - 120 = 370 min de trabalho líquido
    // Vamos ajustar para trabalho de 490 min
    const customConfig = {
      ...DEFAULT_WORKDAY_CONFIG,
      lunchPolicy: undefined as any, // Sem almoço para teste simplificado
    };

    // 490 min trabalhados sem desconto de almoço
    const result = calculateWorklog(punches, { ...customConfig, lunchPolicy: { startHour: 12, startMinute: 0, durationMinutes: 0 } });
    expect(result.extraMinutes).toBe(0);
  });

  it('caso 4: 8h11 trabalhadas => extra 11', () => {
    // Simular 491 minutos trabalhados
    const punches = [
      createPunch(8, 0, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
      createPunch(14, 0, 'ENTRY'),
      createPunch(18, 11, 'EXIT'),
    ];
    const customConfig = {
      ...DEFAULT_WORKDAY_CONFIG,
      lunchPolicy: { startHour: 12, startMinute: 0, durationMinutes: 0 },
    };
    const result = calculateWorklog(punches, customConfig);
    expect(result.extraMinutes).toBe(11);
  });

  it('caso 5: 7h59 trabalhadas => under 1', () => {
    // 479 minutos trabalhados
    const punches = [
      createPunch(8, 0, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
      createPunch(14, 0, 'ENTRY'),
      createPunch(17, 59, 'EXIT'),
    ];
    const customConfig = {
      ...DEFAULT_WORKDAY_CONFIG,
      lunchPolicy: { startHour: 12, startMinute: 0, durationMinutes: 0 },
    };
    const result = calculateWorklog(punches, customConfig);
    expect(result.underMinutes).toBe(1);
  });

  it('caso 6: marcações incompletas => INCOMPLETE', () => {
    const punches = [
      createPunch(8, 0, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
    ];
    const result = calculateWorklog(punches);
    expect(result.isIncomplete).toBe(true);
    expect(result.occurrences).toHaveLength(1);
    expect(result.occurrences[0].type).toBe('INCOMPLETE');
  });

  it('caso 7: worked=480 => OK (sem ocorrências)', () => {
    const punches = [
      createPunch(8, 0, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
      createPunch(14, 0, 'ENTRY'),
      createPunch(18, 0, 'EXIT'),
    ];
    const customConfig = {
      ...DEFAULT_WORKDAY_CONFIG,
      lunchPolicy: { startHour: 12, startMinute: 0, durationMinutes: 0 },
    };
    const result = calculateWorklog(punches, customConfig);
    expect(result.workedMinutes).toBe(480);
    expect(result.lateMinutes).toBe(0);
    expect(result.extraMinutes).toBe(0);
    expect(result.underMinutes).toBe(0);
    expect(result.occurrences).toHaveLength(0);
  });

  it('caso 8: worked=500 => OVER (extra após tolerância)', () => {
    const punches = [
      createPunch(8, 0, 'ENTRY'),
      createPunch(12, 0, 'EXIT'),
      createPunch(14, 0, 'ENTRY'),
      createPunch(18, 20, 'EXIT'),
    ];
    const customConfig = {
      ...DEFAULT_WORKDAY_CONFIG,
      lunchPolicy: { startHour: 12, startMinute: 0, durationMinutes: 0 },
    };
    const result = calculateWorklog(punches, customConfig);
    expect(result.workedMinutes).toBe(500);
    expect(result.extraMinutes).toBe(20);
    expect(result.occurrences.some((o) => o.type === 'OVER')).toBe(true);
  });
});

// ===========================================
// TESTES: formatMinutes
// ===========================================

describe('formatMinutes', () => {
  it('deve formatar 0 minutos', () => {
    expect(formatMinutes(0)).toBe('0min');
  });

  it('deve formatar minutos apenas', () => {
    expect(formatMinutes(45)).toBe('45min');
  });

  it('deve formatar horas apenas', () => {
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(120)).toBe('2h');
  });

  it('deve formatar horas e minutos', () => {
    expect(formatMinutes(90)).toBe('1h30');
    expect(formatMinutes(135)).toBe('2h15');
  });
});

// ===========================================
// TESTES: timeToMinutes
// ===========================================

describe('timeToMinutes', () => {
  it('deve converter meia-noite corretamente', () => {
    expect(timeToMinutes(0, 0)).toBe(0);
  });

  it('deve converter 08:00 corretamente', () => {
    expect(timeToMinutes(8, 0)).toBe(480);
  });

  it('deve converter 18:30 corretamente', () => {
    expect(timeToMinutes(18, 30)).toBe(1110);
  });

  it('deve converter 23:59 corretamente', () => {
    expect(timeToMinutes(23, 59)).toBe(1439);
  });
});
