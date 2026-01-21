import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0min';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

export function formatDateBR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

export function getOccurrenceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    LATE: 'Atraso',
    OVER: 'Hora Extra',
    UNDER: 'Falta de Horas',
    INCOMPLETE: 'Incompleto',
  };
  return labels[type] || type;
}

export function getOccurrenceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    OPEN: 'Aberta',
    ACK: 'Confirmada',
    RESOLVED: 'Resolvida',
  };
  return labels[status] || status;
}

export function getStatusColor(
  status: string
): 'red' | 'yellow' | 'green' | 'blue' {
  const colors: Record<string, 'red' | 'yellow' | 'green' | 'blue'> = {
    OPEN: 'red',
    ACK: 'yellow',
    RESOLVED: 'green',
  };
  return colors[status] || 'blue';
}

export function getTypeColor(
  type: string
): 'red' | 'yellow' | 'green' | 'blue' | 'purple' {
  const colors: Record<string, 'red' | 'yellow' | 'green' | 'blue' | 'purple'> =
    {
      LATE: 'yellow',
      OVER: 'blue',
      UNDER: 'red',
      INCOMPLETE: 'purple',
    };
  return colors[type] || 'blue';
}
