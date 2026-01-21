import type {
  Punch,
  LunchPolicy,
  WorkdayConfig,
  WorklogCalculation,
  OccurrenceType,
  PunchType,
} from '@controle-ponto/types';

// ===========================================
// DEFAULT CONFIGURATION
// ===========================================

export const DEFAULT_WORKDAY_CONFIG: WorkdayConfig = {
  expectedStartHour: 8,
  expectedStartMinute: 0,
  expectedEndHour: 18,
  expectedEndMinute: 0,
  expectedWorkMinutes: 480, // 8 horas
  toleranceMinutes: 10,
  lunchPolicy: {
    startHour: 12,
    startMinute: 0,
    durationMinutes: 120, // 2 horas
  },
};

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Converte hora e minuto para minutos desde meia-noite
 */
export function timeToMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

/**
 * Extrai hora e minuto de uma Date (considerando timezone local)
 */
export function getTimeFromDate(date: Date): { hour: number; minute: number } {
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

/**
 * Converte Date para minutos desde meia-noite
 */
export function dateToMinutesSinceMidnight(date: Date): number {
  const { hour, minute } = getTimeFromDate(date);
  return timeToMinutes(hour, minute);
}

// ===========================================
// CORE CALCULATION FUNCTIONS
// ===========================================

/**
 * Calcula os minutos de atraso na entrada.
 *
 * REGRA DE FRANQUIA TOTAL:
 * - Se entrada dentro da tolerância (até expectedStart + tolerance): atraso = 0
 * - Se entrada após tolerância: atraso = diferença TOTAL desde o horário esperado
 *   (ex: entrada 08:11 com tolerância 10 => atraso = 11, não 1)
 */
export function computeLateMinutes(
  entryTime: Date,
  toleranceMinutes: number = 10,
  expectedStartHour: number = 8,
  expectedStartMinute: number = 0
): number {
  const entryMinutes = dateToMinutesSinceMidnight(entryTime);
  const expectedStartTotal = timeToMinutes(expectedStartHour, expectedStartMinute);
  const toleranceLimit = expectedStartTotal + toleranceMinutes;

  // Se chegou no horário ou antes: não há atraso
  if (entryMinutes <= expectedStartTotal) {
    return 0;
  }

  // Se chegou dentro da tolerância: não há atraso (franquia)
  if (entryMinutes <= toleranceLimit) {
    return 0;
  }

  // Se chegou após a tolerância: atraso é a diferença TOTAL desde o horário esperado
  // Exemplo: chegou 08:11, esperado 08:00 => atraso = 11 minutos
  return entryMinutes - expectedStartTotal;
}

/**
 * Calcula os minutos extras trabalhados.
 *
 * REGRA DE FRANQUIA TOTAL:
 * - Se trabalhou até expectedWork + tolerance: extra = 0
 * - Se trabalhou mais que expectedWork + tolerance: extra = diferença TOTAL acima de expectedWork
 *   (ex: trabalhou 491min com tolerância 10 => extra = 11, não 1)
 */
export function computeExtraMinutes(
  workedMinutes: number,
  expectedWorkMinutes: number = 480,
  toleranceMinutes: number = 10
): number {
  const toleranceLimit = expectedWorkMinutes + toleranceMinutes;

  // Se trabalhou menos ou igual ao esperado: não há extra
  if (workedMinutes <= expectedWorkMinutes) {
    return 0;
  }

  // Se trabalhou dentro da tolerância: não há extra (franquia)
  if (workedMinutes <= toleranceLimit) {
    return 0;
  }

  // Se trabalhou mais que a tolerância: extra é a diferença TOTAL acima do esperado
  // Exemplo: trabalhou 491min, esperado 480 => extra = 11 minutos
  return workedMinutes - expectedWorkMinutes;
}

/**
 * Calcula os minutos faltantes (trabalhou menos que o esperado).
 * Não há tolerância para falta - qualquer minuto a menos conta.
 */
export function computeUnderMinutes(
  workedMinutes: number,
  expectedWorkMinutes: number = 480
): number {
  return Math.max(0, expectedWorkMinutes - workedMinutes);
}

/**
 * Calcula minutos trabalhados a partir das marcações de ponto.
 *
 * Considera pares de entrada/saída.
 * Subtrai almoço automaticamente se houver marcações que o cubram.
 */
export function computeWorkedMinutes(
  punches: Punch[],
  lunchPolicy?: LunchPolicy
): number {
  if (punches.length < 2) {
    return 0;
  }

  // Ordena por timestamp
  const sorted = [...punches].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  let totalMinutes = 0;
  let i = 0;

  // Processa pares de entrada/saída
  while (i < sorted.length - 1) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // Busca um par válido: ENTRY seguido de EXIT
    if (current.type === 'ENTRY' && next.type === 'EXIT') {
      const entryMinutes = dateToMinutesSinceMidnight(current.timestamp);
      const exitMinutes = dateToMinutesSinceMidnight(next.timestamp);

      const periodMinutes = exitMinutes - entryMinutes;
      if (periodMinutes > 0) {
        totalMinutes += periodMinutes;
      }
      i += 2;
    } else {
      // Se não é um par válido, avança um
      i += 1;
    }
  }

  // Subtrai almoço se configurado e se o período de trabalho o cobriu
  if (lunchPolicy && totalMinutes > 0) {
    // Verifica se há marcações que indicam período de almoço
    // Para simplificar, se trabalhou mais de 6 horas, subtrai almoço
    if (totalMinutes >= 360) {
      totalMinutes = Math.max(0, totalMinutes - lunchPolicy.durationMinutes);
    }
  }

  return totalMinutes;
}

/**
 * Verifica se as marcações estão incompletas.
 *
 * Considera incompleto se:
 * - Menos de 4 marcações (entrada, saída almoço, volta almoço, saída)
 * - Número ímpar de marcações
 * - Não há pelo menos um par entrada/saída
 */
export function isPunchesIncomplete(punches: Punch[]): boolean {
  if (punches.length === 0) {
    return true;
  }

  // Verifica número mínimo para um dia completo (4 marcações)
  if (punches.length < 4) {
    return true;
  }

  // Verifica se há número par de marcações
  if (punches.length % 2 !== 0) {
    return true;
  }

  // Ordena e verifica se há pares válidos
  const sorted = [...punches].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  let hasValidPair = false;
  for (let i = 0; i < sorted.length - 1; i += 2) {
    if (sorted[i].type === 'ENTRY' && sorted[i + 1].type === 'EXIT') {
      hasValidPair = true;
    } else {
      // Se qualquer par não for válido, é incompleto
      return true;
    }
  }

  return !hasValidPair;
}

/**
 * Gera as ocorrências baseado no worklog calculado.
 */
export function generateOccurrences(
  workedMinutes: number,
  lateMinutes: number,
  extraMinutes: number,
  underMinutes: number,
  isIncomplete: boolean
): Array<{ type: OccurrenceType; minutes: number }> {
  const occurrences: Array<{ type: OccurrenceType; minutes: number }> = [];

  if (isIncomplete) {
    occurrences.push({ type: 'INCOMPLETE' as OccurrenceType, minutes: 0 });
    return occurrences;
  }

  if (lateMinutes > 0) {
    occurrences.push({ type: 'LATE' as OccurrenceType, minutes: lateMinutes });
  }

  if (extraMinutes > 0) {
    occurrences.push({ type: 'OVER' as OccurrenceType, minutes: extraMinutes });
  }

  if (underMinutes > 0) {
    occurrences.push({ type: 'UNDER' as OccurrenceType, minutes: underMinutes });
  }

  return occurrences;
}

/**
 * Calcula o worklog completo a partir das marcações.
 */
export function calculateWorklog(
  punches: Punch[],
  config: WorkdayConfig = DEFAULT_WORKDAY_CONFIG
): WorklogCalculation {
  const isIncomplete = isPunchesIncomplete(punches);

  if (isIncomplete) {
    return {
      workedMinutes: 0,
      lateMinutes: 0,
      extraMinutes: 0,
      underMinutes: 0,
      isIncomplete: true,
      occurrences: [{ type: 'INCOMPLETE' as OccurrenceType, minutes: 0 }],
    };
  }

  // Ordena marcações
  const sorted = [...punches].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  // Encontra primeira entrada
  const firstEntry = sorted.find((p) => p.type === 'ENTRY');

  // Calcula minutos trabalhados
  const workedMinutes = computeWorkedMinutes(punches, config.lunchPolicy);

  // Calcula atraso
  const lateMinutes = firstEntry
    ? computeLateMinutes(
        firstEntry.timestamp,
        config.toleranceMinutes,
        config.expectedStartHour,
        config.expectedStartMinute
      )
    : 0;

  // Calcula extra
  const extraMinutes = computeExtraMinutes(
    workedMinutes,
    config.expectedWorkMinutes,
    config.toleranceMinutes
  );

  // Calcula falta
  const underMinutes = computeUnderMinutes(workedMinutes, config.expectedWorkMinutes);

  // Gera ocorrências
  const occurrences = generateOccurrences(
    workedMinutes,
    lateMinutes,
    extraMinutes,
    underMinutes,
    false
  );

  return {
    workedMinutes,
    lateMinutes,
    extraMinutes,
    underMinutes,
    isIncomplete: false,
    occurrences,
  };
}

/**
 * Formata minutos para exibição (ex: 90 => "1h30")
 */
export function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0min';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

/**
 * Formata hora de uma Date (ex: "08:15")
 */
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
